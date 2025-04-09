import React, { useState } from "react";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc as firestoreSetDoc,
    getDocs
} from "firebase/firestore";

import { DarkContainer, StyledButton } from "../components/UIComponents";

const db = getFirestore();

export default function MigrationTool({ user }) {
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [leagueId, setLeagueId] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState("");

    const runMigration = async () => {
        if (!user) {
            setError("You must be logged in to run migration.");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Starting migration...");
            setError("");

            // Create a new league
            const leaguesCollectionRef = collection(db, "leagues");
            const newLeagueRef = doc(leaguesCollectionRef);
            const newLeagueId = newLeagueRef.id;
            setLeagueId(newLeagueId);

            // Generate a random invite code
            const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            setInviteCode(newInviteCode);

            setStatus(`Creating new league with ID: ${newLeagueId} and invite code: ${newInviteCode}`);

            // Create the league document
            await firestoreSetDoc(newLeagueRef, {
                name: "My Basketball League",
                inviteCode: newInviteCode,
                createdAt: new Date(),
                createdBy: user.uid,
                members: [user.uid],
                admins: [user.uid]
            });

            setStatus("League document created");

            // Create user document
            const userDocRef = doc(db, "users", user.uid);
            await sfirestoreSetDocetDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                leagues: [newLeagueId]
            }, { merge: true });

            setStatus("User document created");

            // Get all existing sets
            const setsCollectionRef = collection(db, "sets");
            const setsSnapshot = await getDocs(setsCollectionRef);

            setStatus(`Found ${setsSnapshot.docs.length} sets to migrate`);

            // Migrate each set
            for (const firestoreSetDoc of setsSnapshot.docs) {
                const setId = firestoreSetDoc.id;
                const setData = firestoreSetDoc.data();

                setStatus(`Migrating set: ${setId}`);

                // Create the set in the new structure
                const newSetDocRef = doc(db, "leagues", newLeagueId, "sets", setId);
                await firestoreSetDoc(newSetDocRef, setData);

                setStatus(`Set ${setId} migrated successfully`);
            }

            setStatus("Migration completed successfully!");

        } catch (error) {
            console.error("Migration failed:", error);
            setError(`Migration failed: ${error.message}`);
            // Clear success indicators on error
            setLeagueId("");
            setInviteCode("");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DarkContainer>
            <h1 className="text-2xl font-bold text-white mb-4">Data Migration Tool</h1>

            <p className="text-gray-300 mb-4">
                This tool will migrate your existing data to the new league-based structure.
                Only run this once.
            </p>

            {!user && (
                <div className="bg-yellow-800 text-yellow-100 p-4 rounded mb-6">
                    You need to sign in before running the migration
                </div>
            )}

            <StyledButton
                onClick={runMigration}
                className={`w-full mb-6 ${isLoading || !user ? 'bg-gray-600' : 'bg-blue-600'}`}
                disabled={isLoading || !user}
            >
                {isLoading ? "Migration in progress..." : "Run Migration"}
            </StyledButton>

            {status && (
                <div className="bg-gray-800 p-4 rounded mb-4">
                    <h2 className="text-white font-semibold mb-2">Status:</h2>
                    <pre className="text-gray-300 whitespace-pre-wrap">{status}</pre>
                </div>
            )}

            {error && (
                <div className="bg-red-800 text-red-100 p-4 rounded mb-4">
                    {error}
                </div>
            )}

            {leagueId && inviteCode && (
                <div className="bg-green-800 text-green-100 p-4 rounded">
                    <h2 className="font-semibold mb-2">Migration Complete!</h2>
                    <p><strong>League ID:</strong> {leagueId}</p>
                    <p><strong>Invite Code:</strong> {inviteCode}</p>
                    <p className="mt-2">
                        You can now use the app with the new league structure.
                        Don't delete your old data until you've verified everything works correctly.
                    </p>
                </div>
            )}
        </DarkContainer>
    );
}