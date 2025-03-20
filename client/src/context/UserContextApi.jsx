import { createContext, useContext, useEffect, useState } from "react";

// Create the context
const UserContext = createContext();

// Provider component to wrap around your app
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("userData"));
        if (storedUser) {
            setUser(storedUser);
        }
        setLoading(false); // Set loading to false after fetching user data
    }, []);

    // Function to update user data
    const updateUser = (newUserData) => {
        setUser(newUserData);
        localStorage.setItem("userData", JSON.stringify(newUserData));
    };

    return (
        <UserContext.Provider value={{ user, updateUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook for consuming the context
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
