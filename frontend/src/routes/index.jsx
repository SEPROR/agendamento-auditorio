import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Relatorio from '../pages/Relatorio/Relatorio';
import Login from '../pages/Login/Login'

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/agendamentos" element={<Home />} />
                <Route path="/agendamentos/relatorio" element={<Relatorio />} />
                <Route path="/" element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;