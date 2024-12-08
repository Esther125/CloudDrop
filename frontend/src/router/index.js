import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import api from '@/api/api';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/about',
            name: 'about',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/StorageView.vue'),
            meta: { requireAuth: true },
        },
        {
            path: '/history',
            name: 'history',
            component: () => import('../views/HistoryView.vue'),
            meta: { requireAuth: true },
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('../views/RegisterView.vue'),
        },
        {
            path: '/logout',
            name: 'logout',
            component: () => import('../views/LogoutView.vue'),
            meta: { requireAuth: true },
        },
    ],
});

router.beforeEach(async (to, from, next) => {
    if (to.meta.requireAuth) {
        try {
            await api.get('/auth-check');
        } catch (error) {
            if (!error.response || error.response.status !== 401) {
                next(false);
            }
        }
    }
    next();
});

export default router;
