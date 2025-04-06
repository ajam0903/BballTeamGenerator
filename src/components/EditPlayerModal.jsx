import React, { useState, useEffect } from "react";
import { StyledButton } from "./UIComponents";

export default function EditPlayerModal({ player, onSave, onClose }) {
    const [form, setForm] = useState({ ...player });

    useEffect(() => {
        setForm({ ...player });
    }, [player]);

    const handleChange = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: key === "name" ? value : parseInt(value) || 0,
        }));
    };


    const handleSubmit = () => {
        onSave(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-md space-y-4 text-gray-100">
                <h2 className="text-xl font-bold">
                    {player.name ? `Edit Player: ${player.name}` : "Add New Player"}
                </h2>

                {/* Name Input Field */}
                <div>
                    <label className="block text-sm capitalize mb-1">Name</label>
                    <input
                        type="text"
                        value={form.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                        placeholder="Enter player name"
                    />
                </div>

                {Object.keys(form).map((key) => {
                    if (key === "name" || key === "submissions" || key === "active") return null;
                    return (
                        <div key={key}>
                            <label className="block text-sm capitalize mb-1">{key}</label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={form[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                            />
                        </div>
                    );
                })}
                <div className="flex justify-end space-x-2 pt-4">
                    <StyledButton className="bg-gray-600" onClick={onClose}>Cancel</StyledButton>
                    <StyledButton className="bg-green-600" onClick={handleSubmit}>Save</StyledButton>
                </div>
            </div>
        </div>
    );
}
