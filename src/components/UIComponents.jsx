// /src/components/UIComponents.jsx

// Minimal set of utility components
// for a dark-themed layout and styled buttons/inputs.
// UIComponents.jsx
export function DarkContainer({ children }) {
    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen p-6">
            {children}
        </div>

    );
}

export const Section = ({ title, children }) => (
    <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <div className="space-y-4">{children}</div>
    </div>
);

export const StyledInput = (props) => (
    <input
        {...props}
        className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
);

export const StyledButton = ({ children, className = '', ...props }) => (
    <button
        {...props}
        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`}
    >
        {children}
    </button>
);

/** 
 * If you want a basic table style:
 * We don't strictly need these for the dark theme,
 * but you can keep them if you want your <table> 
 * usage to look consistent.
 */

export const StyledTable = ({ children }) => (
    <table className="min-w-full border border-gray-300 text-sm">
        {children}
    </table>
);

export const TableHeader = ({ children }) => (
    <thead className="bg-gray-100">
        <tr>{children}</tr>
    </thead>
);

export const TableCell = ({ children }) => (
    <td className="border px-3 py-2 text-left">{children}</td>
);

export const TableRow = ({ children }) => (
    <tr>{children}</tr>
);
