import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '../css/global.css'; 
import AppRouter from './AppRouter';

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    </React.StrictMode>
);