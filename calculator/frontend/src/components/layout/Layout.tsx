import React from 'react';

const Layout = ({ children }) => {
    return (
        <>
            <div id="headerContainer" className="max-w-7xl mx-auto pt-10 px-6">
                {/* Cleaned up legacy title and link button */}
            </div>

            <div id="mainContentWrapper" className="max-w-7xl mx-auto p-6 min-h-[calc(100vh-100px)]">
                {children}
            </div>

            <div
                id="toast"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{ visibility: "hidden", opacity: 0 }}
                className="fixed left-1/2 top-6 z-[9999] w-fit max-w-[90vw] -translate-x-1/2 rounded-full bg-zinc-900/90 px-5 py-3 text-center text-sm font-semibold text-white shadow-xl backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70 whitespace-pre-line pointer-events-none transition-opacity duration-200"
            />
        </>
    );
};

export default Layout;
