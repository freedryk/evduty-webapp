'use client';

import React, { useState } from 'react';

export default function MainMenu() {
    const [selectedOption, setSelectedOption] = useState(null);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };

    return (
        <div>
            <h1>Main Menu</h1>
        </div>
    )
};
