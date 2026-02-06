import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type ClienteRow = Database['public']['Tables']['clientes']['Row'] & {
  membresia?: {
    caracteristicas: string[] | null
  } | null
};

interface ClientAuthContextType {
  session: Session | null;
  user: User | null;
  cliente: ClienteRow | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType>({
  session: null,
  user: null,
  cliente: null,
  loading: true,
  signOut: async () => {},
});

export const ClientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cliente, setCliente] = useState<ClienteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchClienteData(session.user.email);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchClienteData(session.user.email);
      } else {
        setCliente(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchClienteData = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*, membresia:membresias(caracteristicas)")
        .eq("email", email)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching client data:", error);
      }
      
      setCliente(data);
    } catch (err) {
      console.error("Unexpected error fetching client:", err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCliente(null);
    setUser(null);
    setSession(null);
  };

  return (
    <ClientAuthContext.Provider value={{ session, user, cliente, loading, signOut }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => useContext(ClientAuthContext);
