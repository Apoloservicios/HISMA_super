<?php
// 📧 ARCHIVO: api/send-email-with-attachment.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Validar y obtener datos JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos JSON inválidos']);
    exit();
}

// Validar campos requeridos
$required_fields = ['name', 'email', 'message'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => "Campo requerido faltante: $field"
        ]);
        exit();
    }
}

try {
    // Configuración SMTP
    $smtp_server = 'mail.hisma.com.ar';
    $smtp_port = 587;
    $smtp_username = 'info@hisma.com.ar';
    $smtp_password = 'Lubrihisma25*'; // ⚠️ CAMBIAR POR LA CONTRASEÑA REAL
    
    // Destinatarios
    $to_email = 'info@hisma.com.ar';
    $to_name = 'HISMA Soporte';
    
    // Datos del remitente
    $from_email = $smtp_username;
    $from_name = 'Sistema HISMA';
    $reply_to = $data['email'];
    
    // Generar ID único para la solicitud
    $request_id = 'TRANSFER-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 6);
    
    // Asunto del email
    $subject = "🏦 SOLICITUD TRANSFERENCIA BANCARIA - $request_id";
    
    // Detectar si es solicitud de transferencia bancaria
    $is_transfer_request = isset($data['paymentData']) && isset($data['attachment']);
    
    if ($is_transfer_request) {
        $subject = "🏦 SOLICITUD ACTIVACIÓN POR TRANSFERENCIA - $request_id";
    }
    
    // Headers del email
    $boundary = md5(uniqid());
    $headers = [
        "From: $from_name <$from_email>",
        "Reply-To: $reply_to",
        "MIME-Version: 1.0",
        "Content-Type: multipart/mixed; boundary=\"$boundary\""
    ];
    
    // Cuerpo del mensaje
    $message_body = "--$boundary\r\n";
    $message_body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message_body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    
    // Contenido del mensaje
    if ($is_transfer_request) {
        $payment_data = $data['paymentData'];
        $transfer_data = $payment_data['transferData'];
        $user_info = $data['userInfo'];
        
        $message_body .= "SOLICITUD DE ACTIVACIÓN POR TRANSFERENCIA BANCARIA\n";
        $message_body .= "===============================================\n\n";
        
        $message_body .= "📋 ID de Solicitud: $request_id\n";
        $message_body .= "📅 Fecha de Solicitud: " . date('d/m/Y H:i:s') . "\n\n";
        
        $message_body .= "=== INFORMACIÓN DEL PLAN ===\n";
        $message_body .= "Plan: " . ($payment_data['planName'] ?? 'No especificado') . "\n";
        $message_body .= "Precio del Plan: $" . number_format($payment_data['planPrice'] ?? 0, 0, ',', '.') . "\n\n";
        
        $message_body .= "=== DATOS DE LA TRANSFERENCIA ===\n";
        $message_body .= "Banco Origen: " . ($transfer_data['bankName'] ?? 'No especificado') . "\n";
        $message_body .= "Monto Transferido: $" . number_format($transfer_data['transferAmount'] ?? 0, 0, ',', '.') . "\n";
        $message_body .= "Fecha de Transferencia: " . ($transfer_data['transferDate'] ?? 'No especificada') . "\n";
        $message_body .= "Número de Referencia: " . ($transfer_data['referenceNumber'] ?: 'No proporcionado') . "\n";
        $message_body .= "Comentarios: " . ($transfer_data['comments'] ?: 'Sin comentarios') . "\n\n";
        
        $message_body .= "=== INFORMACIÓN DEL LUBRICENTRO ===\n";
        $message_body .= "ID Lubricentro: " . ($user_info['lubricentroId'] ?? 'No disponible') . "\n";
        $message_body .= "Nombre: " . ($user_info['lubricentroNombre'] ?? 'No disponible') . "\n";
        $message_body .= "Direccion: " . ($user_info['lubricentroDireccion'] ?? 'No disponible') . "\n";
        $message_body .= "Cuit: " . ($user_info['lubricentroCuit'] ?? 'No disponible') . "\n";
        $message_body .= "Telefono: " . ($user_info['lubricentroTelefono'] ?? 'No disponible') . "\n\n";
        
        $message_body .= "=== INFORMACIÓN DEL USUARIO ===\n";
        $message_body .= "Nombre: " . ($data['name'] ?? 'No especificado') . "\n";
        $message_body .= "Email: " . ($data['email'] ?? 'No especificado') . "\n";
        $message_body .= "Rol: " . ($user_info['role'] ?? 'No especificado') . "\n\n";
        
        $message_body .= "⚠️  ACCIÓN REQUERIDA:\n";
        $message_body .= "1. Verificar la transferencia bancaria\n";
        $message_body .= "2. Validar el comprobante adjunto\n";
        $message_body .= "3. Activar la membresía del lubricentro\n";
        $message_body .= "4. Notificar al cliente de la activación\n\n";
        
        $message_body .= "---\n";
        $message_body .= "Este email fue generado automáticamente desde el sistema HISMA.\n";
        $message_body .= "Solicitud ID: $request_id\n";
        
    } else {
        // Email de soporte normal
        $message_body .= "MENSAJE DE SOPORTE\n";
        $message_body .= "==================\n\n";
        $message_body .= "De: " . $data['name'] . " <" . $data['email'] . ">\n";
        $message_body .= "Fecha: " . date('d/m/Y H:i:s') . "\n\n";
        $message_body .= "Mensaje:\n" . $data['message'] . "\n\n";
        
        if (isset($data['userInfo'])) {
            $user_info = $data['userInfo'];
            $message_body .= "---\nInformación del usuario:\n";
            $message_body .= "ID: " . ($user_info['id'] ?? '') . "\n";
            $message_body .= "Email: " . ($user_info['email'] ?? '') . "\n";
            $message_body .= "Rol: " . ($user_info['role'] ?? '') . "\n";
            $message_body .= "Lubricentro ID: " . ($user_info['lubricentroId'] ?? '') . "\n";
        }
    }
    
    $message_body .= "\r\n--$boundary\r\n";
    
    // Adjuntar archivo si existe
    if (isset($data['attachment']) && !empty($data['attachment']['content'])) {
        $attachment = $data['attachment'];
        $filename = $attachment['filename'];
        $file_content = $attachment['content'];
        $file_type = $attachment['type'] ?? 'application/octet-stream';
        
        // Validar que el contenido base64 sea válido
        $decoded_content = base64_decode($file_content, true);
        if ($decoded_content === false) {
            throw new Exception('Contenido del archivo inválido');
        }
        
        // Validar tamaño del archivo (máximo 10MB)
        if (strlen($decoded_content) > 10 * 1024 * 1024) {
            throw new Exception('El archivo adjunto es demasiado grande');
        }
        
        // Agregar el archivo adjunto
        $message_body .= "Content-Type: $file_type; name=\"$filename\"\r\n";
        $message_body .= "Content-Transfer-Encoding: base64\r\n";
        $message_body .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
        $message_body .= chunk_split($file_content) . "\r\n";
        $message_body .= "--$boundary--\r\n";
    } else {
        // Cerrar el boundary si no hay adjuntos
        $message_body .= "--$boundary--\r\n";
    }
    
    // Configurar headers adicionales para el envío
    $mail_headers = implode("\r\n", $headers);
    
    // Log para debugging (opcional)
    error_log("HISMA Email: Enviando email a $to_email con asunto: $subject");
    
    // Enviar el email usando la función mail() de PHP
    $mail_sent = mail($to_email, $subject, $message_body, $mail_headers);
    
    if ($mail_sent) {
        // Respuesta exitosa
        $response = [
            'success' => true,
            'message' => $is_transfer_request 
                ? 'Solicitud de transferencia enviada exitosamente. Procesaremos tu pago en 24-48 horas hábiles.'
                : 'Mensaje enviado exitosamente. Te responderemos a la brevedad.',
            'requestId' => $request_id,
            'timestamp' => date('c')
        ];
        
        // Log del éxito
        error_log("HISMA Email: Email enviado exitosamente. ID: $request_id");
        
    } else {
        throw new Exception('Error al enviar el email');
    }
    
} catch (Exception $e) {
    // Log del error
    error_log("HISMA Email Error: " . $e->getMessage());
    
    http_response_code(500);
    $response = [
        'success' => false,
        'message' => 'Error interno del servidor: ' . $e->getMessage(),
        'timestamp' => date('c')
    ];
}

// Enviar respuesta JSON
echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>