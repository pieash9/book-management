import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'book-management.theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') {
            return 'dark';
        }

        return window.localStorage.getItem(STORAGE_KEY) ?? 'dark';
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark')),
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button className="theme-toggle" type="button" onClick={toggleTheme}>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">
                {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <span className="relative inline-flex h-7 w-14 items-center rounded-full border border-white/10 bg-black/25 p-1 transition">
                <span
                    className={`h-5 w-5 rounded-full transition ${
                        theme === 'dark'
                            ? 'translate-x-7 bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)]'
                            : 'translate-x-0 bg-[#12141a] shadow-[0_0_18px_rgba(18,20,26,0.25)]'
                    }`}
                />
            </span>
        </button>
    );
}
