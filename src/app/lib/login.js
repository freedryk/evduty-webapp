'use client';

import * as evduty from '@/app/lib/evduty_api.js';

export default function login(formData) {
    console.log('Login form submitted:', formData);

    let email = formData.get('email');
    let password = formData.get('password');

    console.log('Email:', email);
    let response = evduty.login(email, password)

    console.log('Login response:', response);

    setTimeout(2000);

}