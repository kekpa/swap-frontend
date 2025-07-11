import React, { createContext, useState, useContext, ReactNode } from "react";

interface AccountContextType {
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
}

const defaultValue: AccountContextType = {
  selectedAccountId: "",
  setSelectedAccountId: () => {},
};

const AccountContext = createContext<AccountContextType>(defaultValue);

export const useAccountContext = () => useContext(AccountContext);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  return (
    <AccountContext.Provider
      value={{ selectedAccountId, setSelectedAccountId }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export default AccountContext;
