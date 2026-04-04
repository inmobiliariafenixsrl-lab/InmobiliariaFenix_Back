// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

// FORZAR IPv4
dns.setDefaultResultOrder('ipv4first');

async function testEmail() {
  console.log('=== TEST DE CONFIGURACIÓN DE EMAIL ===');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurada' : '❌ No configurada');
  
  // Eliminar espacios de la contraseña si los tiene
  let password = process.env.SMTP_PASS;
  if (password && password.includes(' ')) {
    password = password.replace(/\s/g, '');
    console.log('⚠️ Se eliminaron espacios de la contraseña');
  }
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: password,
    },
    family: 4,  // Solo forzar IPv4, sin localAddress
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
  
  try {
    console.log('Intentando conectar a Gmail...');
    await transporter.verify();
    console.log('✅ Configuración correcta - Conectado a Gmail exitosamente');
    
    // Probar envío de correo de prueba
    console.log('\n📧 Probando envío de correo...');
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: '✅ Test de conexión exitoso',
      text: 'Si recibes este correo, la configuración funciona correctamente.',
    });
    console.log('✅ Correo de prueba enviado correctamente');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('Código:', error.code);
  }
}

testEmail();