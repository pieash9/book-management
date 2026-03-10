import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
    },
});

function cleanParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );
}

function collection(response) {
    return response.data;
}

function resource(response) {
    return response.data.data;
}

function payload(response) {
    return response.data;
}

function toBookFormData(values) {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
            return;
        }

        if (key === 'cover_image') {
            if (value instanceof File) {
                formData.append(key, value);
            }

            return;
        }

        formData.append(key, value);
    });

    if (values.remove_cover_image) {
        formData.set('remove_cover_image', '1');
    }

    return formData;
}

export function setAuthToken(token) {
    if (!token) {
        delete api.defaults.headers.common.Authorization;
        return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export const authApi = {
    login(values) {
        return api.post('/v1/login', values).then(payload);
    },
    register(values) {
        return api.post('/v1/register', values).then(payload);
    },
    user() {
        return api.get('/v1/user').then(resource);
    },
    logout() {
        return api.post('/v1/logout').then(payload);
    },
};

export const dashboardApi = {
    statistics() {
        return api.get('/v1/statistics').then(payload);
    },
    firstFiveBooks() {
        return api.get('/v2/books/first-five').then(collection);
    },
};

export const authorsApi = {
    list(params = {}) {
        return api.get('/v1/authors', { params: cleanParams(params) }).then(collection);
    },
    show(id) {
        return api.get(`/v1/authors/${id}`).then(resource);
    },
    create(values) {
        return api.post('/v1/authors', values).then(resource);
    },
    update(id, values) {
        return api.put(`/v1/authors/${id}`, values).then(resource);
    },
    remove(id) {
        return api.delete(`/v1/authors/${id}`).then(payload);
    },
};

export const booksApi = {
    list(params = {}) {
        return api.get('/v1/books', { params: cleanParams(params) }).then(collection);
    },
    show(id) {
        return api.get(`/v1/books/${id}`).then(resource);
    },
    create(values) {
        return api
            .post('/v1/books', toBookFormData(values), {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(resource);
    },
    update(id, values) {
        const formData = toBookFormData(values);
        formData.append('_method', 'PUT');

        return api
            .post(`/v1/books/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(resource);
    },
    remove(id) {
        return api.delete(`/v1/books/${id}`).then(payload);
    },
};

export const membersApi = {
    list(params = {}) {
        return api.get('/v1/members', { params: cleanParams(params) }).then(collection);
    },
    show(id) {
        return api.get(`/v1/members/${id}`).then(resource);
    },
    create(values) {
        return api.post('/v1/members', values).then(resource);
    },
    update(id, values) {
        return api.put(`/v1/members/${id}`, values).then(resource);
    },
    remove(id) {
        return api.delete(`/v1/members/${id}`).then(payload);
    },
};

export const borrowingsApi = {
    list(params = {}) {
        return api.get('/v1/borrowings', { params: cleanParams(params) }).then(collection);
    },
    show(id) {
        return api.get(`/v1/borrowings/${id}`).then(resource);
    },
    create(values) {
        return api.post('/v1/borrowings', values).then(resource);
    },
    returnBook(id) {
        return api.post(`/v1/borrowings/${id}/return`).then(resource);
    },
    overdue(params = {}) {
        return api.get('/v1/borrowings/overdue/list', { params: cleanParams(params) }).then(collection);
    },
};
