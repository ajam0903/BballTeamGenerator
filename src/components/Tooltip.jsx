import { useState, useEffect } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function Tooltip({ text, position = "top" }) {
    const [show, setShow] = useState(false);

    // Auto-hide tooltip after 3s on mobile click
    useEffect(() => {
        let timer;
        if (show && window.innerWidth < 768) {
            timer = setTimeout(() => {
                setShow(false);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [show]);

    return (
        <div
            className="relative group inline-block"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={() => setShow(true)} // show on mobile click
        >
            <QuestionMarkCircleIcon className="w-4 h-4 text-blue-400 cursor-pointer inline" />

            {/* Tooltip container */}
            <div
                className={`absolute z-50 w-64 bg-black text-white text-sm px-3 py-2 rounded shadow-lg ${show ? "block" : "hidden"
                    } bottom-full mb-2 left-1/2 transform -translate-x-1/2`}
            >
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-black"></div>
                {text}
            </div>
        </div>
    );
}
