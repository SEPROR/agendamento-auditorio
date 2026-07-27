import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Relatorio from '../pages/Relatorio/Relatorio';

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/agendamentos/relatorio" element={<Relatorio />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;