<?php
/**
 * ========================================
 * HISMA - API de Envío de Emails
 * Versión con config.php seguro
 * ========================================
 */

// ==============================
// 1. CARGAR CONFIGURACIÓN SEGURA
// ==============================
define('HISMA_CONFIG', true);

// Cargar config.php desde FUERA de public_html
// Ajusta la ruta según tu estructura de Hostinger
$config_path = dirname(__DIR__, 2) . '/config.php'; // Sube 2 niveles desde api/

if (!file_exists($config_path)) {
    error_log('ERROR CRÍTICO: config.php no encontrado en: ' . $config_path);
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Error de configuración del servidor']));
}

$config = require $config_path;

// ==============================
// 2. VALIDAR CONFIGURACIÓN
// ==============================
if (!isset($config['smtp']) || empty($config['smtp']['password'])) {
    error_log('ERROR: Configuración SMTP incompleta');
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Error de configuración del servidor']));
}

// ==============================
// 3. CONFIGURACIÓN DE SEGURIDAD
// ==============================

// Prevenir acceso sin HTTPS en producción
if ($config['app']['environment'] === 'production') {
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'Se requiere conexión HTTPS']));
    }
}

// Rate Limiting por IP
session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$rate_limit_key = 'email_rate_' . md5($ip);
$max_emails = $config['security']['max_email_per_hour'];

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'time' => time()];
}

$rate_data = $_SESSION[$rate_limit_key];
if ($rate_data['time'] > time() - 3600) {
    if ($rate_data['count'] >= $max_emails) {
        http_response_code(429);
        die(json_encode(['success' => false, 'message' => 'Demasiadas solicitudes. Intente más tarde.']));
    }
    $_SESSION[$rate_limit_key]['count']++;
} else {
    $_SESSION[$rate_limit_key] = ['count' => 1, 'time' => time()];
}

// ==============================
// 4. HEADERS DE SEGURIDAD
// ==============================
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// ==============================
// 5. CORS
// ==============================
$allowed_origins = $config['security']['allowed_origins'];

if (isset($_SERVER['HTTP_ORIGIN'])) {
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 3600');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
    }
    exit(0);
}

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'message' => 'Método no permitido']));
}

// ==============================
// 6. CARGAR PHPMAILER
// ==============================
require_once __DIR__ . '/phpmailer/PHPMailer.php';
require_once __DIR__ . '/phpmailer/SMTP.php';
require_once __DIR__ . '/phpmailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ==============================
// 7. PROCESAR DATOS
// ==============================
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'JSON inválido']));
}

// ==============================
// 8. VALIDACIÓN
// ==============================
function sanitize_input($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

$name = isset($data['name']) ? sanitize_input($data['name']) : '';
$email = isset($data['email']) ? sanitize_input($data['email']) : '';
$message = isset($data['message']) ? sanitize_input($data['message']) : '';
$userInfo = isset($data['userInfo']) ? $data['userInfo'] : null;

// Validar campos obligatorios
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']));
}

// Validar longitud
if (strlen($name) < 2 || strlen($name) > 100) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'El nombre debe tener entre 2 y 100 caracteres']));
}

if (strlen($message) < 10 || strlen($message) > 2000) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'El mensaje debe tener entre 10 y 2000 caracteres']));
}

// Validar email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'Email inválido']));
}

// Detectar spam
$spam_words = ['viagra', 'casino', 'lottery', 'winner', 'prize'];
$message_lower = strtolower($message);
foreach ($spam_words as $spam_word) {
    if (stripos($message_lower, $spam_word) !== false) {
        error_log("Spam detectado de IP: {$ip}");
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'Contenido no permitido']));
    }
}

// ==============================
// 9. PREPARAR EMAIL HTML
// ==============================
$html_body = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2E7D32 0%, #43A047 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
        .info-box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #2E7D32; border-radius: 4px; }
        .label { font-weight: bold; color: #2E7D32; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📧 Nuevo Mensaje de Contacto</h1>
            <p style="margin: 5px 0 0 0;">Sistema HISMA</p>
        </div>
        <div class="content">
            <div class="info-box">
                <p><span class="label">Nombre:</span> ' . htmlspecialchars($name) . '</p>
                <p><span class="label">Email:</span> ' . htmlspecialchars($email) . '</p>
                <p><span class="label">Fecha:</span> ' . date('d/m/Y H:i:s') . '</p>
            </div>
            
            <h3 style="color: #2E7D32;">Mensaje:</h3>
            <div style="background: #fafafa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
' . nl2br(htmlspecialchars($message)) . '
            </div>';

// Información del lubricentro
if ($userInfo && isset($userInfo['lubricentroId'])) {
    $html_body .= '
            <div class="info-box" style="margin-top: 20px; border-left-color: #1976d2;">
                <h3 style="margin-top: 0; color: #1976d2;">Información del Lubricentro</h3>';
    
    if (!empty($userInfo['lubricentroNombre'])) {
        $html_body .= '<p><span class="label">Nombre:</span> ' . htmlspecialchars($userInfo['lubricentroNombre']) . '</p>';
    }
    
    $html_body .= '<p><span class="label">ID:</span> ' . htmlspecialchars($userInfo['lubricentroId']) . '</p>';
    
    if (!empty($userInfo['lubricentroDireccion'])) {
        $html_body .= '<p><span class="label">Dirección:</span> ' . htmlspecialchars($userInfo['lubricentroDireccion']) . '</p>';
    }
    
    if (!empty($userInfo['lubricentroTelefono'])) {
        $html_body .= '<p><span class="label">Teléfono:</span> ' . htmlspecialchars($userInfo['lubricentroTelefono']) . '</p>';
    }
    
    $html_body .= '</div>';
}

$html_body .= '
        </div>
        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
            <p>Email automático del sistema HISMA</p>
            <p>IP: ' . htmlspecialchars($ip) . '</p>
        </div>
    </div>
</body>
</html>';

// ==============================
// 10. ENVIAR CON PHPMAILER
// ==============================
$mail = new PHPMailer(true);
$smtp = $config['smtp'];

try {
    // Configuración SMTP
    $mail->isSMTP();
    $mail->Host = $smtp['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtp['username'];
    $mail->Password = $smtp['password'];
    $mail->SMTPSecure = $smtp['secure'];
    $mail->Port = $smtp['port'];
    $mail->CharSet = 'UTF-8';
    $mail->Timeout = 10;
    
    // Remitente y destinatario
    $mail->setFrom($smtp['from_email'], $smtp['from_name']);
    $mail->addAddress($smtp['recipient']);
    $mail->addReplyTo($email, $name);
    
    // Contenido
    $mail->isHTML(true);
    $mail->Subject = "Contacto HISMA: Mensaje de {$name}";
    $mail->Body = $html_body;
    $mail->AltBody = strip_tags(str_replace('<br>', "\n", $html_body));
    
    // Enviar
    $mail->send();
    
    error_log("Email enviado: {$email} (IP: {$ip})");
    
    echo json_encode([
        'success' => true,
        'message' => 'Mensaje enviado correctamente. Te contactaremos pronto.'
    ]);
    
} catch (Exception $e) {
    error_log("Error email: {$mail->ErrorInfo}");
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al enviar el mensaje. Intenta más tarde.'
    ]);
}
?>