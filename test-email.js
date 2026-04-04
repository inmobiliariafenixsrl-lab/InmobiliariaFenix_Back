// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

// FORZAR IPv4 - Esta es la clave para que funcione
dns.setDefaultResultOrder('ipv4first');

async function testEmail() {
  console.log('=== TEST DE CONFIGURACIÓN DE EMAIL ===');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurada' : '❌ No configurada');
  console.log('Forzando IPv4...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    family: 4,           // Forzar IPv4
    localAddress: '0.0.0.0', // Forzar IPv4
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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
    
    // Diagnóstico adicional
    console.log('\n--- DIAGNÓSTICO ---');
    console.log('1. Verifica que la contraseña de aplicación sea correcta');
    console.log('2. Verifica que tu firewall no bloquee el puerto 587');
    console.log('3. Prueba con: telnet smtp.gmail.com 587');
  }
}

testEmail();