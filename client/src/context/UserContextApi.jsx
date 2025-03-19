import { createContext, useContext, useEffect, useState } from "react";

// Create the context
const UserContext = createContext();

// Provider component to wrap around your app
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // Load user data from localStorage on initial render
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("userData"));
        if (storedUser) {
            setUser(storedUser);
        }
    }, []);

    // Function to update user data
    const updateUser = (newUserData) => {
        setUser(newUserData);
        localStorage.setItem("userData", JSON.stringify(newUserData));
    };

    return (
        <UserContext.Provider value={{ user, updateUser }}>
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
