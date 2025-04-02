// UIComponents.jsx
export const Section = ({ title, children }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

export const StyledInput = (props) => (
  <input
    {...props}
    className="border border-gray-300 rounded px-3 py-2 w-full"
  />
);

export const StyledButton = ({ children, ...props }) => (
  <button
    {...props}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    {children}
  </button>
);

export const StyledTable = ({ children }) => (
  <table className="min-w-full border border-gray-300 text-sm">{children}</table>
);
