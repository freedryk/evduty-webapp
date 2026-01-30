'use client';

import React, { createContext, useContext } from 'react';
import { useFormStatus } from 'react-dom';

import { login } from '@/app/lib/evduty_api.js';

export const TokenContext = createContext();

function Submit() {
    const status = useFormStatus();

    console.log('Submit pending:', status.pending);
    return (
        <button type="submit" disabled={status.pending}>
            {status.pending ? 'Logging in...' : 'Login'}
        </button>
    );
}

export function LoginForm() {

    const { setToken } = useContext(TokenContext);

    async function handleLogin(formData) {
        console.log('handleLogin:', formData);
        const email = formData.get('email');
        const password = formData.get('password');

        const response = await login(email, password);
        const data = await response.json();
        console.log('Login response:', data);
        setToken(data);
    }

    return (
        <form action={handleLogin} >
            <input type="text" name="email" placeholder="Email" />
            <input type="password" name="password" placeholder="Password" />
            <Submit />
        </form>
    );
}
