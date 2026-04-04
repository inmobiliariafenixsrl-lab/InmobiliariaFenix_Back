require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Probando configuración de email...');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    family: 4,
  });
  
  try {
    await transporter.verify();
    console.log('✅ Configuración correcta - Conectado a Gmail');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testEmail();