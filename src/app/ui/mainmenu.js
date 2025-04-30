'use client';

import { useState, useContext, useEffect } from 'react';

import { TokenContext } from "@/app/ui/login.js";

import { get } from '@/app/lib/evduty_api.js';

export default function MainMenu() {
    const [data, setData] = useState(null);

    const { token, setToken } = useContext(TokenContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await get(token.accessToken, 'v1/account/stations');
                const data = await response.json();
                setData(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [token]);

    console.log("data:", data);

    return (
        <div>
            <h1>Main Menu</h1>
            <div>{JSON.stringify(data)}</div>
            <button onClick={() => setData(Math.random())}>reset</button>
        </div>
    )
};
