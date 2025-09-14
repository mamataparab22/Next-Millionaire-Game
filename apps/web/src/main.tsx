import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Home } from './pages/Home'
import { Play } from './pages/Play'
import { Results } from './pages/Results'
import { NotFound } from './pages/NotFound'
import { Layout } from './components/Layout'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/play', element: <Play /> },
      { path: '/results', element: <Results /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </React.StrictMode>
)
