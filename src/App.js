import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://dnx817df-3939.uks1.devtunnels.ms/");

export default function App() {
    const [activePage, setActivePage] = useState("main");
    const [staffProfiles, setStaffProfiles] = useState([]);
    const [bluesProfiles, setBluesProfiles] = useState([]);
    const [greensProfiles, setGreensProfiles] = useState([]);
    const [guest, setGuest] = useState("");

    useEffect(() => {
        const handleProfiles = (type, setter) => (data) => {
            if (Array.isArray(data)) {
                setter(data);
            } else {
                console.error(`${type} data is not an array`, data);
            }
        };

        socket.on("Staff", handleProfiles("Staff", setStaffProfiles));
        socket.on("Blues", handleProfiles("Blues", setBluesProfiles));
        socket.on("Greens", handleProfiles("Greens", setGreensProfiles));

        return () => {
            socket.off("Staff", handleProfiles("Staff", setStaffProfiles));
            socket.off("Blues", handleProfiles("Blues", setBluesProfiles));
            socket.off("Greens", handleProfiles("Greens", setGreensProfiles));
        };
    }, []);

    const handleSignIn = (type, profile) => {
        socket.emit(`${type.toLowerCase()}-sign-in`, profile);
    };

    const handleCreateProfile = (type) => {
        const name = prompt(`Enter ${type} name:`);
        if (name) socket.emit(`new-${type.toLowerCase()}`, name);
    };

    const handleGuest = () => {
        if (guest) {
            socket.emit("guest", guest);
            setGuest(""); // Clear the input after submitting
        }
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
                    <button onClick={() => { setActivePage("staff"); socket.emit("get-Staff"); }}>
                        Staff
                    </button>
                    <button onClick={() => { setActivePage("blues"); socket.emit("get-Blues"); }}>
                        Sea cadets
                    </button>
                    <button onClick={() => { setActivePage("greens"); socket.emit("get-Greens"); }}>
                        Marine cadets
                    </button>
                    <button onClick={() => { setActivePage("guests"); }}>
                        Guests
                    </button>
                </div>
            ) : (
                <div>
                    {activePage === "staff" && <ProfileList type="Staff" profiles={staffProfiles} />}
                    {activePage === "blues" && <ProfileList type="Blues" profiles={bluesProfiles} />}
                    {activePage === "greens" && <ProfileList type="Greens" profiles={greensProfiles} />}
                    {activePage === "guests" && (
                        <>
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
                </div>
            )}
        </div>
    );
}
