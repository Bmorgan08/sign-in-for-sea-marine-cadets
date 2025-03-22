import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export default function App() {
    const [activePage, setActivePage] = useState("main");
    const [staffProfiles, setStaffProfiles] = useState([]);
    const [bluesProfiles, setBluesProfiles] = useState([]);
    const [greensProfiles, setGreensProfiles] = useState([]);
    const [juniorsProfiles, setJuniorsProfiles] = useState([]);
    const [guest, setGuest] = useState("");
    const [signedInData, setSignedInData] = useState("");

    const socketRef = useRef(null);

    useEffect(() => {
        // Initialize the socket connection
        const socket = io('https://dnx817df-3939.uks1.devtunnels.ms/', {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;
        console.log("Connected to server");

        const handleProfiles = (type, setter) => (data) => {
            if (Array.isArray(data)) {
                setter(data);
            } else {
                console.error(`${type} data is not an array`, data);
            }
        };

        // Set up listeners
        socket.on("Staff", handleProfiles("Staff", setStaffProfiles));
        socket.on("Blues", handleProfiles("Blues", setBluesProfiles));
        socket.on("Greens", handleProfiles("Greens", setGreensProfiles));
        socket.on("Juniors", handleProfiles("Juniors", setJuniorsProfiles));
        socket.on("all-signed-in", (data) => setSignedInData(data));

        // Clean up socket connection on component unmount
        return () => {
            socket.disconnect();
        };
    }, []);

    const handleSignIn = (type, profile) => {
        socketRef.current.emit(`${type.toLowerCase()}-sign-in`, profile);
    };

    const handleCreateProfile = (type) => {
        const name = prompt(`Enter ${type} name:`);
        if (name) socketRef.current.emit(`new-${type.toLowerCase()}`, name);
    };

    const handleGuest = () => {
        if (guest) {
            socketRef.current.emit("guest", guest);
            setGuest("");
        }
    };

    const handleShowAllSignedIn = () => {
        socketRef.current.emit("display-current-signed-in");
    };

    const ProfileList = ({ type, profiles }) => (
        <>
            <div id="buttons">
                <button onClick={() => handleCreateProfile(type)}>Create {type} Profile</button>
                <button onClick={() => setActivePage("main")}>Back to Main</button>
            </div>
            <ul>
                {profiles.map((profile, index) => (
                    <li key={index}>
                        {profile.name}
                        {!profile.isSignedIn ? (
                            <button onClick={() => handleSignIn(type, profile)}>Sign in</button>
                        ) : (
                            <p>Signed in</p>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );

    return (
        <div>
            {activePage === "main" ? (
                <div id="mainPage">
                    <button onClick={() => { setActivePage("staff"); socketRef.current.emit("get-Staff"); }}>Staff</button>
                    <button onClick={() => { setActivePage("blues"); socketRef.current.emit("get-Blues"); }}>Sea cadets</button>
                    <button onClick={() => { setActivePage("greens"); socketRef.current.emit("get-Greens"); }}>Marine cadets</button>
                    <button onClick={() => { setActivePage("juniors"); socketRef.current.emit("get-Juniors"); }}>Juniors</button>
                    <button onClick={() => { setActivePage("guests"); }}>Guests</button>
                    <button onClick={() => { handleShowAllSignedIn(); setActivePage("signed-in"); }}>Show All Signed In</button>
                </div>
            ) : (
                <div>
                    {activePage === "staff" && <ProfileList type="Staff" profiles={staffProfiles} />}
                    {activePage === "blues" && <ProfileList type="Blues" profiles={bluesProfiles} />}
                    {activePage === "greens" && <ProfileList type="Greens" profiles={greensProfiles} />}
                    {activePage === "juniors" && <ProfileList type="Juniors" profiles={juniorsProfiles} />}
                    {activePage === "guests" && (
                        <>
                            <div id="buttons">
                                <button onClick={() => setActivePage("main")}>Back to Main</button>
                            </div>
                            <h2>Enter Guest Name:</h2>
                            <input
                                type="text"
                                value={guest}
                                onChange={(e) => setGuest(e.target.value)}
                                placeholder="Enter guest name"
                            />
                            <button onClick={handleGuest}>Submit</button>
                        </>
                    )}
                    {activePage === "signed-in" && signedInData && (
                        <div>
                            <h2>Signed-In Users:</h2>
                            <pre>{signedInData}</pre>
                            <button onClick={() => setActivePage("main")}>Back to Main</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
