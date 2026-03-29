import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  );
};

export default PageTransition;
