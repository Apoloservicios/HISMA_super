<?php
// Permitir peticiones CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Allow methods

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}, Content-Type"); // Allow headers

    exit(0);
}

header('Content-Type: application/json'); // Indica que la respuesta será JSON

// Incluir los archivos de PHPMailer. Ajusta la ruta si es necesario.
require 'phpmailer/Exception.php';
require 'phpmailer/PHPMailer.php';
require 'phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- Configuración ---
$recipient_email = 'info@hisma.com.ar'; // La dirección a la que quieres recibir los emails
$sender_name_in_email = 'Soporte HISMA'; // Nombre que aparecerá como remitente en el email

// Configuración SMTP (¡Usa los datos de TU cuenta de email en Hostinger!)
$smtp_host = 'smtp.hostinger.com'; // O el que te proporcione Hostinger
$smtp_username = 'info@hisma.com.ar'; // TU cuenta de email COMPLETA en Hostinger
$smtp_password = 'Lubrihisma25*'; // TU contraseña de email
$smtp_port = 465; // Normalmente 465 para SSL o 587 para TLS
$smtp_secure = 'ssl'; // Usa 'ssl' o 'tls' según la configuración de tu servidor

// --- Procesar la petición POST ---
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true); // Decodifica el JSON a un array asociativo

$response = array('success' => false, 'message' => '');

// Validar si los datos se recibieron correctamente
if ($data === null) {
    $response['message'] = 'Error al decodificar JSON.';
    echo json_encode($response);
    exit;
}

$name = isset($data['name']) ? htmlspecialchars(strip_tags($data['name'])) : '';
$email = isset($data['email']) ? htmlspecialchars(strip_tags($data['email'])) : '';
$message = isset($data['message']) ? htmlspecialchars(strip_tags($data['message'])) : '';
$userInfo = isset($data['userInfo']) ? $data['userInfo'] : null;

// Validar campos obligatorios
if (empty($name) || empty($email) || empty($message)) {
    $response['message'] = 'Por favor, completa todos los campos.';
    echo json_encode($response);
    exit;
}

// Validar formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Formato de email inválido.';
    echo json_encode($response);
    exit;
}

// --- Enviar email con PHPMailer ---
$mail = new PHPMailer(true); // Pasar `true` habilita las excepciones

try {
    // Configuración del Servidor
    $mail->isSMTP();                                            // Enviar usando SMTP
    $mail->Host       = $smtp_host;                           // Servidor SMTP
    $mail->SMTPAuth   = true;                                   // Habilitar autenticación SMTP
    $mail->Username   = $smtp_username;                       // Nombre de usuario SMTP (tu email completo)
    $mail->Password   = $smtp_password;                       // Contraseña SMTP
    $mail->SMTPSecure = $smtp_secure;                           // Habilitar cifrado TLS o SSL
    $mail->Port       = $smtp_port;                             // Puerto SMTP
    $mail->CharSet    = 'UTF-8';                                // Establecer el juego de caracteres

    // Remitente (El email que usas para autenticarte en SMTP)
    // A veces es útil que el "Reply-To" sea el email del usuario que llena el formulario
    $mail->setFrom($smtp_username, $sender_name_in_email);
    $mail->addReplyTo($email, $name); // Para que al responder, respondas al usuario

    // Destinatario (Tu email donde quieres recibir los mensajes)
    $mail->addAddress($recipient_email);

    // Preparar la información del lubricentro si existe
    $lubricentroInfo = '';
    if ($userInfo && isset($userInfo['lubricentroId']) && !empty($userInfo['lubricentroId'])) {
        $lubricentroInfo = '<div style="background-color: #f5f5f5; padding: 15px; margin-top: 20px; border-left: 4px solid #2E7D32; border-radius: 4px;">';
        $lubricentroInfo .= '<h3 style="margin-top: 0; color: #2E7D32;">Información del Lubricentro</h3>';
        
        if (isset($userInfo['lubricentroNombre']) && !empty($userInfo['lubricentroNombre'])) {
            $lubricentroInfo .= '<p><strong>Nombre:</strong> ' . htmlspecialchars($userInfo['lubricentroNombre']) . '</p>';
        }
        
        $lubricentroInfo .= '<p><strong>ID:</strong> ' . htmlspecialchars($userInfo['lubricentroId']) . '</p>';
        
        if (isset($userInfo['lubricentroDireccion']) && !empty($userInfo['lubricentroDireccion'])) {
            $lubricentroInfo .= '<p><strong>Dirección:</strong> ' . htmlspecialchars($userInfo['lubricentroDireccion']) . '</p>';
        }
        
        if (isset($userInfo['lubricentroTelefono']) && !empty($userInfo['lubricentroTelefono'])) {
            $lubricentroInfo .= '<p><strong>Teléfono:</strong> ' . htmlspecialchars($userInfo['lubricentroTelefono']) . '</p>';
        }
        
        $lubricentroInfo .= '</div>';
    }

    // Preparar información del usuario
    $userInfoHtml = '';
    if ($userInfo) {
        $userInfoHtml = '<div style="background-color: #eef2ff; padding: 15px; margin-top: 20px; border-radius: 4px;">';
        $userInfoHtml .= '<h3 style="margin-top: 0; color: #4F46E5;">Información del Usuario</h3>';
        
        if (isset($userInfo['id']) && !empty($userInfo['id'])) {
            $userInfoHtml .= '<p><strong>ID Usuario:</strong> ' . htmlspecialchars($userInfo['id']) . '</p>';
        }
        
        if (isset($userInfo['email']) && !empty($userInfo['email'])) {
            $userInfoHtml .= '<p><strong>Email:</strong> ' . htmlspecialchars($userInfo['email']) . '</p>';
        }
        
        if (isset($userInfo['role']) && !empty($userInfo['role'])) {
            $userInfoHtml .= '<p><strong>Rol:</strong> ' . htmlspecialchars($userInfo['role']) . '</p>';
        }
        
        $userInfoHtml .= '</div>';
    }

    // Contenido del Email
    $mail->isHTML(true);                                        // Habilitar formato HTML
    
    // Título del asunto
    $subjectPrefix = '';
    if ($userInfo && isset($userInfo['lubricentroNombre']) && !empty($userInfo['lubricentroNombre'])) {
        $subjectPrefix = '[' . $userInfo['lubricentroNombre'] . '] ';
    }
    $mail->Subject = $subjectPrefix . "Consulta de Soporte HISMA: " . $name;
    
    $mail->Body = "
        <html>
        <head>
            <title>Consulta de Soporte HISMA</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2E7D32; color: white; padding: 15px; text-align: center; border-radius: 4px 4px 0 0; }
                .content { padding: 20px; border: 1px solid #ddd; border-radius: 0 0 4px 4px; background-color: #fff; }
                .message-box { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px; }
                .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Nueva Consulta de Soporte</h2>
                </div>
                <div class='content'>
                    <p><strong>Nombre:</strong> {$name}</p>
                    <p><strong>Email:</strong> {$email}</p>
                    
                    <div class='message-box'>
                        <h3 style='margin-top: 0;'>Mensaje:</h3>
                        <p>" . nl2br($message) . "</p>
                    </div>
                    
                    {$lubricentroInfo}
                    {$userInfoHtml}
                </div>
                <div class='footer'>
                    <p>Este mensaje fue enviado desde el sistema de soporte de HISMA.</p>
                    <p>Fecha: " . date('d/m/Y H:i:s') . "</p>
                </div>
            </div>
        </body>
        </html>
    ";
    
// Versión texto plano del correo
    $mail->AltBody = "Consulta de Soporte HISMA:\n\n";
    $mail->AltBody .= "Nombre: {$name}\n";
    $mail->AltBody .= "Email: {$email}\n\n";
    $mail->AltBody .= "Mensaje:\n{$message}\n\n";
    
    // Añadir información del lubricentro a la versión de texto plano
    if ($userInfo && isset($userInfo['lubricentroId']) && !empty($userInfo['lubricentroId'])) {
        $mail->AltBody .= "--- Información del Lubricentro ---\n";
        $mail->AltBody .= "ID: " . ($userInfo['lubricentroId'] ?? 'No especificado') . "\n";
        
        if (isset($userInfo['lubricentroNombre']) && !empty($userInfo['lubricentroNombre'])) {
            $mail->AltBody .= "Nombre: " . $userInfo['lubricentroNombre'] . "\n";
        }
        
        if (isset($userInfo['lubricentroDireccion']) && !empty($userInfo['lubricentroDireccion'])) {
            $mail->AltBody .= "Dirección: " . $userInfo['lubricentroDireccion'] . "\n";
        }
        
        if (isset($userInfo['lubricentroTelefono']) && !empty($userInfo['lubricentroTelefono'])) {
            $mail->AltBody .= "Teléfono: " . $userInfo['lubricentroTelefono'] . "\n";
        }
        
        $mail->AltBody .= "\n";
    }
    
    // Añadir información del usuario a la versión de texto plano
    if ($userInfo) {
        $mail->AltBody .= "--- Información del Usuario ---\n";
        
        if (isset($userInfo['id']) && !empty($userInfo['id'])) {
            $mail->AltBody .= "ID Usuario: " . $userInfo['id'] . "\n";
        }
        
        if (isset($userInfo['email']) && !empty($userInfo['email'])) {
            $mail->AltBody .= "Email: " . $userInfo['email'] . "\n";
        }
        
        if (isset($userInfo['role']) && !empty($userInfo['role'])) {
            $mail->AltBody .= "Rol: " . $userInfo['role'] . "\n";
        }
    }

    $mail->send();

    $response['success'] = true;
    $response['message'] = 'Mensaje enviado con éxito.';

} catch (Exception $e) {
    // Capturar errores de PHPMailer
    $response['message'] = "Error al enviar el mensaje. Mailer Error: {$mail->ErrorInfo}";
    // Opcional: Loggear el error en el servidor
    error_log("Support form error: " . $e->getMessage() . " - Mailer Error: " . $mail->ErrorInfo);
}

// Enviar la respuesta JSON al frontend
echo json_encode($response);
?>