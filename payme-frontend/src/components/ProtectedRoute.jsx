import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LoadingOverlay } from './Loading';

export default function ProtectedRoute({ children }) {
    const { user } = useApp();
    const token = localStorage.getItem('auth_token');

    if (!user && !token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
