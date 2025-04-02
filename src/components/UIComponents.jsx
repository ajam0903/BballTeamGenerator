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
  <tr className="hover:bg-gray-50">{children}</tr>
);
