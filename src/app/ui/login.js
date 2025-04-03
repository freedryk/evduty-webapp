'use client';

import { useFormStatus } from 'react-dom';

import login from '@/app/lib/login.js';



function Submit() {
    const status = useFormStatus();

    console.log('Submit pending:', status.pending);
    return (
        <button type="submit" disabled={status.pending}>
            {status.pending ? 'Logging in...' : 'Login'}
        </button>
    );
}


export default function LoginForm() {
    return (
        <form action={login}>
            <input type="text" name="email" placeholder="Email" />
            <input type="password" name="password" placeholder="Password" />
            <Submit />
        </form>
    );
}
