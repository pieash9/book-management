import React, { useDeferredValue, useEffect, useState } from 'react';
import { authorsApi, authApi, booksApi, borrowingsApi, dashboardApi, membersApi, setAuthToken } from './lib/api';
import { ThemeToggle } from './contexts/ThemeContext';

const SESSION_KEY = 'book-management.session';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home' },
    { id: 'books', label: 'Books', shortLabel: 'Books' },
    { id: 'authors', label: 'Authors', shortLabel: 'Authors' },
    { id: 'members', label: 'Members', shortLabel: 'Members' },
    { id: 'borrowings', label: 'Borrowings', shortLabel: 'Loans' },
];

const SECTION_COPY = {
    dashboard: {
        eyebrow: 'Library control center',
        title: 'Keep circulation, catalogue health, and member activity in one place.',
        description:
            'This dashboard combines the existing statistics, recent-book, borrowing, and overdue endpoints into a single operating view.',
    },
    books: {
        eyebrow: 'Catalogue management',
        title: 'Manage inventory, pricing, covers, and copy availability.',
        description: 'Use local image uploads for book covers and keep stock aligned with active borrowings.',
    },
    authors: {
        eyebrow: 'Author directory',
        title: 'Curate the writers behind your collection.',
        description: 'Track biographies, nationalities, and how many titles each author has in circulation.',
    },
    members: {
        eyebrow: 'Member registry',
        title: 'Maintain active members and their borrowing readiness.',
        description: 'Search the roster, review membership status, and track active loans by member.',
    },
    borrowings: {
        eyebrow: 'Circulation desk',
        title: 'Issue books, return overdue loans, and monitor due dates.',
        description: 'Borrowings sync directly with book availability, so stock counts stay current.',
    },
};

const DEFAULT_BOOK_FORM = {
    title: '',
    isbn: '',
    description: '',
    author_id: '',
    genre: '',
    published_at: '',
    total_copies: '1',
    available_copies: '1',
    price: '',
    status: 'active',
    cover_image: null,
    remove_cover_image: false,
    cover_image_url: '',
};

const DEFAULT_AUTHOR_FORM = {
    name: '',
    bio: '',
    nationality: '',
};

const DEFAULT_MEMBER_FORM = {
    name: '',
    email: '',
    address: '',
    membership_date: '',
    status: 'active',
};

const DEFAULT_BORROWING_FORM = {
    book_id: '',
    member_id: '',
    borrowed_date: todayAsInput(),
    due_date: offsetDate(14),
};

const BOOK_STATUS_OPTIONS = ['active', 'inactive'];
const MEMBER_STATUS_OPTIONS = ['active', 'inactive'];
const COMMON_GENRES = ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Biography', 'Mystery', 'History'];

export default function App() {
    const [session, setSession] = useState(readStoredSession);
    const [booting, setBooting] = useState(true);
    const [activeSection, setActiveSection] = useState(readHashSection);
    const [authMode, setAuthMode] = useState('login');
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState('');
    const [notice, setNotice] = useState(null);
    const [dataVersion, setDataVersion] = useState(0);
    useEffect(() => {
        const handleHashChange = () => {
            setActiveSection(readHashSection());
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    useEffect(() => {
        const nextHash = `#${activeSection}`;

        if (window.location.hash !== nextHash) {
            window.location.hash = nextHash;
        }
    }, [activeSection]);

    useEffect(() => {
        if (!session?.token) {
            setAuthToken(null);
            setBooting(false);
            return;
        }

        let ignore = false;

        setAuthToken(session.token);
        authApi
            .user()
            .then((user) => {
                if (ignore) {
                    return;
                }

                const nextSession = { token: session.token, user };
                setSession(nextSession);
                writeStoredSession(nextSession);
            })
            .catch(() => {
                if (ignore) {
                    return;
                }

                setAuthToken(null);
                clearStoredSession();
                setSession(null);
            })
            .finally(() => {
                if (!ignore) {
                    setBooting(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setNotice(null);
        }, 4000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [notice]);

    async function handleAuthSubmit(mode, values) {
        setAuthBusy(true);
        setAuthError('');

        try {
            const response = mode === 'register' ? await authApi.register(values) : await authApi.login(values);
            const nextSession = {
                token: response.token,
                user: response.user,
            };

            setAuthToken(response.token);
            writeStoredSession(nextSession);
            setSession(nextSession);
            setActiveSection('dashboard');
            setNotice({
                tone: 'success',
                message: mode === 'register' ? 'Account created and logged in.' : 'Signed in successfully.',
            });
        } catch (error) {
            setAuthError(extractMessage(error));
        } finally {
            setAuthBusy(false);
        }
    }

    async function handleLogout() {
        try {
            await authApi.logout();
        } catch (error) {
            // Clear the session locally even if the current token is already invalid.
        }

        setAuthToken(null);
        clearStoredSession();
        setSession(null);
        setNotice({
            tone: 'success',
            message: 'You have been logged out.',
        });
    }

    function handleDataChanged(message, tone = 'success') {
        setDataVersion((currentValue) => currentValue + 1);

        if (message) {
            setNotice({ message, tone });
        }
    }

    if (booting) {
        return <LoadingSplash label="Restoring your library session..." />;
    }

    if (!session?.token || !session?.user) {
        return (
            <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
                <AuthScreen
                    busy={authBusy}
                    error={authError}
                    mode={authMode}
                    setMode={setAuthMode}
                    onSubmit={handleAuthSubmit}
                />
            </div>
        );
    }

    const sectionCopy = SECTION_COPY[activeSection];

    return (
        <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Sidebar
                    activeSection={activeSection}
                    onLogout={handleLogout}
                    onNavigate={setActiveSection}
                    user={session.user}
                />

                <main className="space-y-5">
                    <section className="hero-shell">
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                            <div className="max-w-3xl space-y-3">
                                <p className="eyebrow">{sectionCopy.eyebrow}</p>
                                <h1 className="font-display text-3xl font-bold leading-tight text-[var(--text-strong)] sm:text-4xl">
                                    {sectionCopy.title}
                                </h1>
                                <p className="max-w-2xl text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                                    {sectionCopy.description}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <ThemeToggle />
                                <button className="btn-secondary" type="button" onClick={() => setActiveSection('dashboard')}>
                                    Overview
                                </button>
                            </div>
                        </div>
                    </section>

                    {notice ? <NoticeBanner notice={notice} /> : null}

                    {activeSection === 'dashboard' ? (
                        <DashboardSection onNavigate={setActiveSection} refreshKey={dataVersion} />
                    ) : null}

                    {activeSection === 'authors' ? (
                        <AuthorsSection onDataChanged={handleDataChanged} refreshKey={dataVersion} />
                    ) : null}

                    {activeSection === 'books' ? (
                        <BooksSection onDataChanged={handleDataChanged} refreshKey={dataVersion} />
                    ) : null}

                    {activeSection === 'members' ? (
                        <MembersSection onDataChanged={handleDataChanged} refreshKey={dataVersion} />
                    ) : null}

                    {activeSection === 'borrowings' ? (
                        <BorrowingsSection onDataChanged={handleDataChanged} refreshKey={dataVersion} />
                    ) : null}
                </main>
            </div>
        </div>
    );
}

function Sidebar({ activeSection, onNavigate, onLogout, user }) {
    return (
        <aside className="panel sticky top-5 flex h-fit flex-col gap-6 p-6">
            <div className="space-y-4">
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-[var(--accent-strong)]">
                    Bookroom OS
                </div>
                <div>
                    <h2 className="font-display text-2xl font-bold text-[var(--text-strong)]">Library console</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                        A single dark-themed workspace for catalogue, members, borrowing activity, and overdue cleanup.
                    </p>
                </div>
            </div>

            <div className="glass-strip flex items-center gap-4 p-4">
                <div className="avatar-circle">{initials(user.name)}</div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{user.name}</p>
                    <p className="truncate text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">{user.email}</p>
                </div>
            </div>

            <nav className="grid gap-2">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        className={joinClasses('nav-button', activeSection === item.id ? 'nav-button-active' : '')}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="font-display text-base font-semibold">{item.label}</span>
                        <span className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">{item.shortLabel}</span>
                    </button>
                ))}
            </nav>

            <div className="panel-divider" />

            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--text-dim)]">Quick notes</p>
                <div className="grid gap-3 text-sm text-[var(--text-soft)]">
                    <div className="glass-strip p-4">
                        Book covers are stored on the public disk and returned as live URLs in the books API.
                    </div>
                    <div className="glass-strip p-4">
                        Dashboard cards are driven from the same API routes used by the CRUD sections.
                    </div>
                </div>
            </div>

            <button className="btn-secondary mt-auto" type="button" onClick={onLogout}>
                Logout
            </button>
        </aside>
    );
}

function AuthScreen({ mode, setMode, onSubmit, busy, error }) {
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
    });
    const [registerForm, setRegisterForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const isRegister = mode === 'register';

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(mode, isRegister ? registerForm : loginForm);
    }

    return (
        <div className="grid w-full gap-5 lg:grid-cols-[1.15fr_minmax(0,480px)]">
            <section className="hero-shell min-h-[560px] justify-between">
                <div className="space-y-4">
                    <p className="eyebrow">Dark-mode circulation hub</p>
                    <h1 className="font-display text-4xl font-bold leading-tight text-[var(--text-strong)] sm:text-5xl">
                        Turn the existing API into a complete library workspace.
                    </h1>
                    <p className="max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                        Register or sign in to manage authors, books, members, overdue borrowings, and locally uploaded cover
                        images from one React dashboard.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <FeatureTile label="Dashboard" text="Live stats, first-five books, recent borrowings, and overdue radar." />
                    <FeatureTile label="Catalogue" text="Create books with author links, pricing, stock counts, and local covers." />
                    <FeatureTile label="Circulation" text="Issue, monitor, and return borrowings without leaving the console." />
                </div>
            </section>

            <section className="panel p-6 sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="eyebrow">{isRegister ? 'Create access' : 'Welcome back'}</p>
                        <h2 className="mt-2 font-display text-2xl font-bold text-[var(--text-strong)]">
                            {isRegister ? 'Register a new librarian account' : 'Login to your workspace'}
                        </h2>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="mb-6 grid grid-cols-2 rounded-full border border-white/10 bg-black/15 p-1">
                    <button
                        className={joinClasses('auth-switch', !isRegister ? 'auth-switch-active' : '')}
                        type="button"
                        onClick={() => setMode('login')}
                    >
                        Login
                    </button>
                    <button
                        className={joinClasses('auth-switch', isRegister ? 'auth-switch-active' : '')}
                        type="button"
                        onClick={() => setMode('register')}
                    >
                        Register
                    </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {isRegister ? (
                        <>
                            <Field label="Full name">
                                <TextInput
                                    value={registerForm.name}
                                    onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                                    placeholder="Ayesha Rahman"
                                    required
                                />
                            </Field>
                            <Field label="Email address">
                                <TextInput
                                    type="email"
                                    value={registerForm.email}
                                    onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                                    placeholder="librarian@example.com"
                                    required
                                />
                            </Field>
                            <Field label="Password">
                                <TextInput
                                    type="password"
                                    value={registerForm.password}
                                    onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                                    placeholder="Minimum 8 characters"
                                    required
                                />
                            </Field>
                            <Field label="Confirm password">
                                <TextInput
                                    type="password"
                                    value={registerForm.password_confirmation}
                                    onChange={(event) =>
                                        setRegisterForm({ ...registerForm, password_confirmation: event.target.value })
                                    }
                                    placeholder="Repeat password"
                                    required
                                />
                            </Field>
                        </>
                    ) : (
                        <>
                            <Field label="Email address">
                                <TextInput
                                    type="email"
                                    value={loginForm.email}
                                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                                    placeholder="librarian@example.com"
                                    required
                                />
                            </Field>
                            <Field label="Password">
                                <TextInput
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                                    placeholder="Your password"
                                    required
                                />
                            </Field>
                        </>
                    )}

                    {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

                    <button className="btn-primary w-full justify-center" type="submit" disabled={busy}>
                        {busy ? 'Working...' : isRegister ? 'Create account' : 'Login'}
                    </button>
                </form>
            </section>
        </div>
    );
}

function DashboardSection({ refreshKey, onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statistics, setStatistics] = useState({
        total_books: 0,
        total_authors: 0,
        total_members: 0,
        book_borrowed: 0,
        overdue_borrowings: 0,
    });
    const [recentBooks, setRecentBooks] = useState([]);
    const [recentBorrowings, setRecentBorrowings] = useState([]);
    const [overdueBorrowings, setOverdueBorrowings] = useState([]);
    const [authors, setAuthors] = useState([]);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        Promise.all([
            dashboardApi.statistics(),
            dashboardApi.firstFiveBooks(),
            borrowingsApi.list({ per_page: 5 }),
            borrowingsApi.overdue({ per_page: 5 }),
            authorsApi.list({ per_page: 5 }),
        ])
            .then(([stats, firstBooks, borrowings, overdue, authorCollection]) => {
                if (ignore) {
                    return;
                }

                setStatistics(stats);
                setRecentBooks(firstBooks.data ?? []);
                setRecentBorrowings(borrowings.data ?? []);
                setOverdueBorrowings(overdue.data ?? []);
                setAuthors(authorCollection.data ?? []);
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(extractMessage(requestError));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    if (loading) {
        return <LoadingPanel label="Pulling dashboard metrics..." />;
    }

    return (
        <div className="grid gap-5">
            {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Books" value={statistics.total_books} accent="teal" />
                <MetricCard label="Authors" value={statistics.total_authors} accent="orange" />
                <MetricCard label="Members" value={statistics.total_members} accent="sky" />
                <MetricCard label="Borrowed now" value={statistics.book_borrowed} accent="rose" />
                <MetricCard label="Overdue" value={statistics.overdue_borrowings} accent="amber" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
                <Panel
                    title="Fresh additions"
                    subtitle="Powered by the existing `v2/books/first-five` endpoint."
                    action={<button className="btn-secondary" onClick={() => onNavigate('books')}>Manage books</button>}
                >
                    {recentBooks.length === 0 ? (
                        <EmptyState
                            title="No books yet"
                            text="Create your first title to populate the catalogue and dashboard."
                        />
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {recentBooks.map((book) => (
                                <article key={book.id} className="glass-strip flex gap-4 p-4">
                                    <BookCover book={book} className="h-28 w-20 shrink-0 rounded-2xl" />
                                    <div className="min-w-0 space-y-3">
                                        <div>
                                            <p className="truncate font-display text-lg font-semibold text-[var(--text-strong)]">
                                                {book.title}
                                            </p>
                                            <p className="text-sm text-[var(--text-soft)]">{book.author?.name ?? 'Unknown author'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <StatusBadge value={book.status} />
                                            <StatusBadge value={book.is_available ? 'available' : 'out of stock'} />
                                        </div>
                                        <p className="text-sm leading-6 text-[var(--text-soft)]">
                                            {book.description || 'No description added yet.'}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel
                    title="Quick actions"
                    subtitle="Jump directly into the CRUD sections."
                >
                    <div className="grid gap-3">
                        <button className="btn-primary justify-between" type="button" onClick={() => onNavigate('borrowings')}>
                            Issue a borrowing
                            <span className="text-xs uppercase tracking-[0.28em]">Loans</span>
                        </button>
                        <button className="btn-secondary justify-between" type="button" onClick={() => onNavigate('books')}>
                            Add or edit books
                            <span className="text-xs uppercase tracking-[0.28em]">Stock</span>
                        </button>
                        <button className="btn-secondary justify-between" type="button" onClick={() => onNavigate('members')}>
                            Maintain members
                            <span className="text-xs uppercase tracking-[0.28em]">Roster</span>
                        </button>
                        <button className="btn-secondary justify-between" type="button" onClick={() => onNavigate('authors')}>
                            Curate authors
                            <span className="text-xs uppercase tracking-[0.28em]">People</span>
                        </button>
                    </div>

                    <div className="panel-divider my-5" />

                    <div className="grid gap-3">
                        {authors.map((author) => (
                            <div key={author.id} className="glass-strip flex items-center justify-between p-4">
                                <div>
                                    <p className="font-display text-lg font-semibold text-[var(--text-strong)]">{author.name}</p>
                                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">
                                        {author.nationality || 'Nationality not set'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-semibold text-[var(--accent-strong)]">{author.books_count ?? 0}</p>
                                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">Books</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <Panel title="Recent borrowings" subtitle="Latest circulation events from the borrowing index endpoint.">
                    {recentBorrowings.length === 0 ? (
                        <EmptyState title="No circulation yet" text="Borrowings will appear here as soon as members check out books." />
                    ) : (
                        <div className="grid gap-3">
                            {recentBorrowings.map((borrowing) => (
                                <BorrowingRow key={borrowing.id} borrowing={borrowing} />
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="Overdue radar" subtitle="The overdue route updates stale records before returning this list.">
                    {overdueBorrowings.length === 0 ? (
                        <EmptyState title="No overdue borrowings" text="All borrowed books are currently inside their due windows." />
                    ) : (
                        <div className="grid gap-3">
                            {overdueBorrowings.map((borrowing) => (
                                <BorrowingRow key={borrowing.id} borrowing={borrowing} />
                            ))}
                        </div>
                    )}
                </Panel>
            </section>
        </div>
    );
}

function AuthorsSection({ refreshKey, onDataChanged }) {
    const [authors, setAuthors] = useState({ data: [], meta: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAuthor, setEditingAuthor] = useState(null);
    const [form, setForm] = useState(DEFAULT_AUTHOR_FORM);
    const [saving, setSaving] = useState(false);
    const deferredSearch = useDeferredValue(search);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        authorsApi
            .list({
                page,
                search: deferredSearch,
                per_page: 8,
            })
            .then((response) => {
                if (!ignore) {
                    setAuthors(response);
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(extractMessage(requestError));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [page, deferredSearch, refreshKey]);

    function openCreateForm() {
        setEditingAuthor(null);
        setForm(DEFAULT_AUTHOR_FORM);
        setIsFormOpen(true);
    }

    function openEditForm(author) {
        setEditingAuthor(author);
        setForm({
            name: author.name ?? '',
            bio: author.bio ?? '',
            nationality: author.nationality ?? '',
        });
        setIsFormOpen(true);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                name: form.name.trim(),
                bio: form.bio.trim() || null,
                nationality: form.nationality.trim() || null,
            };

            if (editingAuthor) {
                await authorsApi.update(editingAuthor.id, payload);
            } else {
                await authorsApi.create(payload);
            }

            setIsFormOpen(false);
            setForm(DEFAULT_AUTHOR_FORM);
            onDataChanged(editingAuthor ? 'Author updated successfully.' : 'Author created successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(author) {
        const confirmed = window.confirm(`Delete "${author.name}"? This also removes related books.`);

        if (!confirmed) {
            return;
        }

        try {
            await authorsApi.remove(author.id);
            onDataChanged('Author deleted successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        }
    }

    return (
        <>
            <Panel
                title="Authors"
                subtitle="Create and maintain the people behind each title."
                action={
                    <button className="btn-primary" type="button" onClick={openCreateForm}>
                        Add author
                    </button>
                }
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <TextInput
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by name, nationality, or bio"
                    />
                    <div className="glass-strip flex items-center justify-between p-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">Visible results</p>
                            <p className="font-display text-2xl font-semibold text-[var(--text-strong)]">
                                {authors.meta?.total ?? 0}
                            </p>
                        </div>
                        <StatusBadge value="directory" />
                    </div>
                </div>

                {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

                {loading ? (
                    <LoadingPanel label="Loading authors..." compact />
                ) : authors.data.length === 0 ? (
                    <EmptyState title="No authors found" text="Add your first author to start building the catalogue." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {authors.data.map((author) => (
                            <article key={author.id} className="glass-strip flex flex-col gap-4 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-display text-xl font-semibold text-[var(--text-strong)]">{author.name}</p>
                                        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">
                                            {author.nationality || 'Nationality not set'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-semibold text-[var(--accent-strong)]">{author.books_count ?? 0}</p>
                                        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">Books</p>
                                    </div>
                                </div>
                                <p className="min-h-20 text-sm leading-7 text-[var(--text-soft)]">
                                    {author.bio || 'No biography added yet.'}
                                </p>
                                <div className="flex gap-3">
                                    <button className="btn-secondary" type="button" onClick={() => openEditForm(author)}>
                                        Edit
                                    </button>
                                    <button className="btn-ghost" type="button" onClick={() => handleDelete(author)}>
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <Pagination meta={authors.meta} onPageChange={setPage} />
            </Panel>

            <Modal
                open={isFormOpen}
                title={editingAuthor ? 'Edit author' : 'Add author'}
                onClose={() => setIsFormOpen(false)}
            >
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Field label="Name">
                        <TextInput
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                            placeholder="Author name"
                            required
                        />
                    </Field>
                    <Field label="Nationality">
                        <TextInput
                            value={form.nationality}
                            onChange={(event) => setForm({ ...form, nationality: event.target.value })}
                            placeholder="Bangladeshi"
                        />
                    </Field>
                    <Field label="Biography">
                        <textarea
                            className="textarea"
                            rows="5"
                            value={form.bio}
                            onChange={(event) => setForm({ ...form, bio: event.target.value })}
                            placeholder="Short background for this author"
                        />
                    </Field>
                    <div className="flex justify-end gap-3">
                        <button className="btn-ghost" type="button" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingAuthor ? 'Update author' : 'Create author'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

function BooksSection({ refreshKey, onDataChanged }) {
    const [books, setBooks] = useState({ data: [], meta: {} });
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [genre, setGenre] = useState('');
    const [status, setStatus] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [form, setForm] = useState(DEFAULT_BOOK_FORM);
    const [saving, setSaving] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');
    const deferredSearch = useDeferredValue(search);
    const genreOptions = uniqueValues([...COMMON_GENRES, ...(books.data ?? []).map((book) => book.genre).filter(Boolean)]);

    useEffect(() => {
        let ignore = false;

        authorsApi
            .list({ per_page: 100 })
            .then((response) => {
                if (!ignore) {
                    setAuthors(response.data ?? []);
                }
            })
            .catch(() => {
                if (!ignore) {
                    setAuthors([]);
                }
            });

        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        booksApi
            .list({
                page,
                per_page: 8,
                search: deferredSearch,
                genre,
                status,
            })
            .then((response) => {
                if (!ignore) {
                    setBooks(response);
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(extractMessage(requestError));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [page, deferredSearch, genre, status, refreshKey]);

    useEffect(() => {
        return () => {
            revokePreview(coverPreview);
        };
    }, [coverPreview]);

    function resetBookForm() {
        revokePreview(coverPreview);
        setCoverPreview('');
        setEditingBook(null);
        setForm(DEFAULT_BOOK_FORM);
        setIsFormOpen(false);
    }

    function openCreateForm() {
        revokePreview(coverPreview);
        setEditingBook(null);
        setCoverPreview('');
        setForm(DEFAULT_BOOK_FORM);
        setIsFormOpen(true);
    }

    function openEditForm(book) {
        revokePreview(coverPreview);
        setEditingBook(book);
        setCoverPreview(book.cover_image ?? '');
        setForm({
            title: book.title ?? '',
            isbn: book.isbn ?? '',
            description: book.description ?? '',
            author_id: String(book.author?.id ?? ''),
            genre: book.genre ?? '',
            published_at: asInputDate(book.published_at),
            total_copies: String(book.total_copies ?? 1),
            available_copies: String(book.available_copies ?? 0),
            price: book.price ?? '',
            status: book.status ?? 'active',
            cover_image: null,
            remove_cover_image: false,
            cover_image_url: book.cover_image ?? '',
        });
        setIsFormOpen(true);
    }

    function handleCoverChange(event) {
        const file = event.target.files?.[0] ?? null;

        revokePreview(coverPreview);
        setCoverPreview(file ? URL.createObjectURL(file) : editingBook?.cover_image ?? '');
        setForm({
            ...form,
            cover_image: file,
            remove_cover_image: false,
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                title: form.title.trim(),
                isbn: form.isbn.trim(),
                description: form.description.trim() || null,
                author_id: form.author_id,
                genre: form.genre.trim() || null,
                published_at: form.published_at || null,
                total_copies: form.total_copies,
                available_copies: form.available_copies,
                price: form.price || null,
                status: form.status,
                cover_image: form.cover_image,
                remove_cover_image: form.remove_cover_image ? '1' : '0',
            };

            if (editingBook) {
                await booksApi.update(editingBook.id, payload);
            } else {
                await booksApi.create(payload);
            }

            resetBookForm();
            onDataChanged(editingBook ? 'Book updated successfully.' : 'Book created successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(book) {
        const confirmed = window.confirm(`Delete "${book.title}"?`);

        if (!confirmed) {
            return;
        }

        try {
            await booksApi.remove(book.id);
            onDataChanged('Book deleted successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        }
    }

    return (
        <>
            <Panel
                title="Books"
                subtitle="The form below sends multipart data so cover images are stored on Laravel's public disk."
                action={
                    <button className="btn-primary" type="button" onClick={openCreateForm}>
                        Add book
                    </button>
                }
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                    <TextInput
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by title, ISBN, or author"
                    />
                    <SelectInput
                        value={genre}
                        onChange={(event) => {
                            setGenre(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All genres</option>
                        {genreOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </SelectInput>
                    <SelectInput
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All statuses</option>
                        {BOOK_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {capitalize(option)}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

                {loading ? (
                    <LoadingPanel label="Loading books..." compact />
                ) : books.data.length === 0 ? (
                    <EmptyState
                        title="No books matched this view"
                        text="Try another search or create a new title with a local cover image."
                    />
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {books.data.map((book) => (
                            <article key={book.id} className="glass-strip flex flex-col gap-5 p-5">
                                <div className="flex gap-4">
                                    <BookCover book={book} className="h-40 w-28 shrink-0 rounded-[24px]" />
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div>
                                            <p className="font-display text-xl font-semibold text-[var(--text-strong)]">{book.title}</p>
                                            <p className="text-sm text-[var(--text-soft)]">{book.author?.name ?? 'Unknown author'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <StatusBadge value={book.status} />
                                            <StatusBadge value={book.is_available ? 'available' : 'out of stock'} />
                                            {book.genre ? <StatusBadge value={book.genre} tone="neutral" /> : null}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-[var(--text-soft)]">
                                            <div>
                                                <p className="label-mini">Copies</p>
                                                <p>
                                                    {book.available_copies}/{book.total_copies}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="label-mini">Price</p>
                                                <p>{formatCurrency(book.price)}</p>
                                            </div>
                                            <div>
                                                <p className="label-mini">Published</p>
                                                <p>{book.published_at ? formatDate(book.published_at) : 'Unknown'}</p>
                                            </div>
                                            <div>
                                                <p className="label-mini">ISBN</p>
                                                <p className="truncate">{book.isbn}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="min-h-16 text-sm leading-7 text-[var(--text-soft)]">
                                    {book.description || 'No description added yet.'}
                                </p>

                                <div className="flex gap-3">
                                    <button className="btn-secondary" type="button" onClick={() => openEditForm(book)}>
                                        Edit
                                    </button>
                                    <button className="btn-ghost" type="button" onClick={() => handleDelete(book)}>
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <Pagination meta={books.meta} onPageChange={setPage} />
            </Panel>

            <Modal
                open={isFormOpen}
                title={editingBook ? 'Edit book' : 'Add book'}
                onClose={resetBookForm}
                widthClassName="max-w-4xl"
            >
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                    <Field label="Title">
                        <TextInput
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            placeholder="Book title"
                            required
                        />
                    </Field>
                    <Field label="ISBN">
                        <TextInput
                            value={form.isbn}
                            onChange={(event) => setForm({ ...form, isbn: event.target.value })}
                            placeholder="978..."
                            required
                        />
                    </Field>
                    <Field label="Author">
                        <SelectInput
                            value={form.author_id}
                            onChange={(event) => setForm({ ...form, author_id: event.target.value })}
                            required
                        >
                            <option value="">Select an author</option>
                            {authors.map((author) => (
                                <option key={author.id} value={author.id}>
                                    {author.name}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Genre">
                        <TextInput
                            value={form.genre}
                            onChange={(event) => setForm({ ...form, genre: event.target.value })}
                            placeholder="Fantasy"
                        />
                    </Field>
                    <Field label="Published date">
                        <TextInput
                            type="date"
                            value={form.published_at}
                            onChange={(event) => setForm({ ...form, published_at: event.target.value })}
                        />
                    </Field>
                    <Field label="Status">
                        <SelectInput
                            value={form.status}
                            onChange={(event) => setForm({ ...form, status: event.target.value })}
                        >
                            {BOOK_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {capitalize(option)}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Total copies">
                        <TextInput
                            type="number"
                            min="1"
                            value={form.total_copies}
                            onChange={(event) => setForm({ ...form, total_copies: event.target.value })}
                            required
                        />
                    </Field>
                    <Field label="Available copies">
                        <TextInput
                            type="number"
                            min="0"
                            value={form.available_copies}
                            onChange={(event) => setForm({ ...form, available_copies: event.target.value })}
                            required
                        />
                    </Field>
                    <Field label="Price (USD)">
                        <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price}
                            onChange={(event) => setForm({ ...form, price: event.target.value })}
                            placeholder="19.99"
                        />
                    </Field>
                    <Field label="Cover image">
                        <div className="space-y-3">
                            <input className="file-input" type="file" accept="image/*" onChange={handleCoverChange} />
                            <p className="text-xs leading-6 text-[var(--text-dim)]">
                                Uploads are stored in `storage/app/public/covers` and returned in the API as a live URL.
                            </p>
                            {coverPreview ? <BookCover book={{ title: form.title || 'Book', cover_image: coverPreview }} className="h-40 w-28 rounded-[24px]" /> : null}
                            {editingBook && form.cover_image_url ? (
                                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
                                    <input
                                        checked={form.remove_cover_image}
                                        type="checkbox"
                                        onChange={(event) => {
                                            if (event.target.checked) {
                                                revokePreview(coverPreview);
                                                setCoverPreview('');
                                            }

                                            setForm({ ...form, remove_cover_image: event.target.checked, cover_image: null });
                                        }}
                                    />
                                    Remove current cover
                                </label>
                            ) : null}
                        </div>
                    </Field>
                    <Field className="md:col-span-2" label="Description">
                        <textarea
                            className="textarea"
                            rows="5"
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                            placeholder="A short summary of the book"
                        />
                    </Field>
                    <div className="md:col-span-2 flex justify-end gap-3">
                        <button className="btn-ghost" type="button" onClick={resetBookForm}>
                            Cancel
                        </button>
                        <button className="btn-primary" type="submit" disabled={saving || authors.length === 0}>
                            {saving ? 'Saving...' : editingBook ? 'Update book' : 'Create book'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

function MembersSection({ refreshKey, onDataChanged }) {
    const [members, setMembers] = useState({ data: [], meta: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [form, setForm] = useState(DEFAULT_MEMBER_FORM);
    const [saving, setSaving] = useState(false);
    const deferredSearch = useDeferredValue(search);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        membersApi
            .list({
                page,
                per_page: 8,
                search: deferredSearch,
                status,
            })
            .then((response) => {
                if (!ignore) {
                    setMembers(response);
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(extractMessage(requestError));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [page, deferredSearch, status, refreshKey]);

    function openCreateForm() {
        setEditingMember(null);
        setForm(DEFAULT_MEMBER_FORM);
        setIsFormOpen(true);
    }

    function openEditForm(member) {
        setEditingMember(member);
        setForm({
            name: member.name ?? '',
            email: member.email ?? '',
            address: member.address ?? '',
            membership_date: asInputDate(member.membership_date),
            status: member.status ?? 'active',
        });
        setIsFormOpen(true);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                address: form.address.trim() || null,
                membership_date: form.membership_date || null,
                status: form.status,
            };

            if (editingMember) {
                await membersApi.update(editingMember.id, payload);
            } else {
                await membersApi.create(payload);
            }

            setIsFormOpen(false);
            setForm(DEFAULT_MEMBER_FORM);
            onDataChanged(editingMember ? 'Member updated successfully.' : 'Member created successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(member) {
        const confirmed = window.confirm(`Delete member "${member.name}"?`);

        if (!confirmed) {
            return;
        }

        try {
            await membersApi.remove(member.id);
            onDataChanged('Member deleted successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        }
    }

    return (
        <>
            <Panel
                title="Members"
                subtitle="Track active members and the loan load attached to each profile."
                action={
                    <button className="btn-primary" type="button" onClick={openCreateForm}>
                        Add member
                    </button>
                }
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <TextInput
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by member name or email"
                    />
                    <SelectInput
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All statuses</option>
                        {MEMBER_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {capitalize(option)}
                            </option>
                        ))}
                    </SelectInput>
                </div>

                {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

                {loading ? (
                    <LoadingPanel label="Loading members..." compact />
                ) : members.data.length === 0 ? (
                    <EmptyState title="No members found" text="Create a member record to start borrowing books." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {members.data.map((member) => (
                            <article key={member.id} className="glass-strip flex flex-col gap-4 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-display text-xl font-semibold text-[var(--text-strong)]">{member.name}</p>
                                        <p className="text-sm text-[var(--text-soft)]">{member.email}</p>
                                    </div>
                                    <StatusBadge value={member.status} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-[var(--text-soft)]">
                                    <div>
                                        <p className="label-mini">Joined</p>
                                        <p>{member.membership_date ? formatDate(member.membership_date) : 'Not set'}</p>
                                    </div>
                                    <div>
                                        <p className="label-mini">Active loans</p>
                                        <p>{member.active_borrowings_count ?? 0}</p>
                                    </div>
                                </div>
                                <p className="min-h-16 text-sm leading-7 text-[var(--text-soft)]">
                                    {member.address || 'No address recorded.'}
                                </p>
                                <div className="flex gap-3">
                                    <button className="btn-secondary" type="button" onClick={() => openEditForm(member)}>
                                        Edit
                                    </button>
                                    <button className="btn-ghost" type="button" onClick={() => handleDelete(member)}>
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <Pagination meta={members.meta} onPageChange={setPage} />
            </Panel>

            <Modal
                open={isFormOpen}
                title={editingMember ? 'Edit member' : 'Add member'}
                onClose={() => setIsFormOpen(false)}
            >
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Field label="Name">
                        <TextInput
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                            placeholder="Member name"
                            required
                        />
                    </Field>
                    <Field label="Email">
                        <TextInput
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            placeholder="member@example.com"
                            required
                        />
                    </Field>
                    <Field label="Membership date">
                        <TextInput
                            type="date"
                            value={form.membership_date}
                            onChange={(event) => setForm({ ...form, membership_date: event.target.value })}
                        />
                    </Field>
                    <Field label="Status">
                        <SelectInput value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                            {MEMBER_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {capitalize(option)}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Address">
                        <textarea
                            className="textarea"
                            rows="4"
                            value={form.address}
                            onChange={(event) => setForm({ ...form, address: event.target.value })}
                            placeholder="Member address"
                        />
                    </Field>
                    <div className="flex justify-end gap-3">
                        <button className="btn-ghost" type="button" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingMember ? 'Update member' : 'Create member'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

function BorrowingsSection({ refreshKey, onDataChanged }) {
    const [borrowings, setBorrowings] = useState({ data: [], meta: {} });
    const [overdueBorrowings, setOverdueBorrowings] = useState([]);
    const [catalog, setCatalog] = useState({ books: [], members: [] });
    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [memberId, setMemberId] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState(DEFAULT_BORROWING_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let ignore = false;

        setCatalogLoading(true);

        Promise.all([
            booksApi.list({ per_page: 100, status: 'active' }),
            membersApi.list({ per_page: 100, status: 'active' }),
        ])
            .then(([bookCollection, memberCollection]) => {
                if (ignore) {
                    return;
                }

                setCatalog({
                    books: (bookCollection.data ?? []).filter((book) => book.is_available),
                    members: memberCollection.data ?? [],
                });
            })
            .catch(() => {
                if (!ignore) {
                    setCatalog({ books: [], members: [] });
                }
            })
            .finally(() => {
                if (!ignore) {
                    setCatalogLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');

        Promise.all([
            borrowingsApi.list({
                page,
                per_page: 8,
                status,
                member_id: memberId,
            }),
            borrowingsApi.overdue({ per_page: 5 }),
        ])
            .then(([borrowingCollection, overdueCollection]) => {
                if (ignore) {
                    return;
                }

                setBorrowings(borrowingCollection);
                setOverdueBorrowings(overdueCollection.data ?? []);
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(extractMessage(requestError));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [page, status, memberId, refreshKey]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await borrowingsApi.create({
                ...form,
                status: 'borrowed',
            });

            setIsFormOpen(false);
            setForm(DEFAULT_BORROWING_FORM);
            onDataChanged('Borrowing created successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function handleReturn(borrowing) {
        try {
            await borrowingsApi.returnBook(borrowing.id);
            onDataChanged('Book returned successfully.');
        } catch (requestError) {
            setError(extractMessage(requestError));
        }
    }

    return (
        <>
            <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
                <Panel
                    title="Borrowings"
                    subtitle="Issue new loans and filter live circulation activity."
                    action={
                        <button
                            className="btn-primary"
                            type="button"
                            onClick={() => setIsFormOpen(true)}
                            disabled={catalogLoading || catalog.books.length === 0 || catalog.members.length === 0}
                        >
                            New borrowing
                        </button>
                    }
                >
                    <div className="grid gap-4 lg:grid-cols-[180px_220px]">
                        <SelectInput
                            value={status}
                            onChange={(event) => {
                                setStatus(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All statuses</option>
                            <option value="borrowed">Borrowed</option>
                            <option value="returned">Returned</option>
                            <option value="overdue">Overdue</option>
                        </SelectInput>
                        <SelectInput
                            value={memberId}
                            onChange={(event) => {
                                setMemberId(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All members</option>
                            {catalog.members.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </SelectInput>
                    </div>

                    {error ? <NoticeBanner notice={{ message: error, tone: 'danger' }} /> : null}

                    {loading ? (
                        <LoadingPanel label="Loading borrowings..." compact />
                    ) : borrowings.data.length === 0 ? (
                        <EmptyState title="No borrowing records found" text="Issue a new borrowing to get circulation started." />
                    ) : (
                        <div className="grid gap-3">
                            {borrowings.data.map((borrowing) => (
                                <BorrowingRow
                                    key={borrowing.id}
                                    action={
                                        borrowing.status !== 'returned' ? (
                                            <button className="btn-secondary" type="button" onClick={() => handleReturn(borrowing)}>
                                                Mark returned
                                            </button>
                                        ) : null
                                    }
                                    borrowing={borrowing}
                                />
                            ))}
                        </div>
                    )}

                    <Pagination meta={borrowings.meta} onPageChange={setPage} />
                </Panel>

                <Panel title="Overdue spotlight" subtitle="These rows come directly from the overdue endpoint.">
                    {overdueBorrowings.length === 0 ? (
                        <EmptyState title="No overdue items" text="Nothing is currently late." />
                    ) : (
                        <div className="grid gap-3">
                            {overdueBorrowings.map((borrowing) => (
                                <BorrowingRow
                                    key={borrowing.id}
                                    action={
                                        <button className="btn-secondary" type="button" onClick={() => handleReturn(borrowing)}>
                                            Return now
                                        </button>
                                    }
                                    borrowing={borrowing}
                                />
                            ))}
                        </div>
                    )}
                </Panel>
            </section>

            <Modal open={isFormOpen} title="Create borrowing" onClose={() => setIsFormOpen(false)}>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Field label="Book">
                        <SelectInput
                            value={form.book_id}
                            onChange={(event) => setForm({ ...form, book_id: event.target.value })}
                            required
                        >
                            <option value="">Select a book</option>
                            {catalog.books.map((book) => (
                                <option key={book.id} value={book.id}>
                                    {book.title} ({book.available_copies} available)
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Member">
                        <SelectInput
                            value={form.member_id}
                            onChange={(event) => setForm({ ...form, member_id: event.target.value })}
                            required
                        >
                            <option value="">Select a member</option>
                            {catalog.members.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Borrowed date">
                            <TextInput
                                type="date"
                                value={form.borrowed_date}
                                onChange={(event) => setForm({ ...form, borrowed_date: event.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Due date">
                            <TextInput
                                type="date"
                                value={form.due_date}
                                onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                                required
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button className="btn-ghost" type="button" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Create borrowing'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

function BorrowingRow({ borrowing, action = null }) {
    return (
        <article className="glass-strip flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-semibold text-[var(--text-strong)]">
                            {borrowing.book?.title ?? 'Unknown book'}
                        </p>
                        <StatusBadge value={borrowing.status} />
                        {borrowing.is_overdue ? <StatusBadge value="late" /> : null}
                    </div>
                    <p className="text-sm text-[var(--text-soft)]">
                        {borrowing.member?.name ?? 'Unknown member'}{borrowing.book?.author?.name ? ` • ${borrowing.book.author.name}` : ''}
                    </p>
                </div>
                {action}
            </div>

            <div className="grid gap-3 text-sm text-[var(--text-soft)] sm:grid-cols-3">
                <div>
                    <p className="label-mini">Borrowed</p>
                    <p>{formatDate(borrowing.borrowed_date)}</p>
                </div>
                <div>
                    <p className="label-mini">Due</p>
                    <p>{formatDate(borrowing.due_date)}</p>
                </div>
                <div>
                    <p className="label-mini">Returned</p>
                    <p>{borrowing.returned_date ? formatDate(borrowing.returned_date) : 'Not returned'}</p>
                </div>
            </div>
        </article>
    );
}

function Panel({ title, subtitle, action = null, children }) {
    return (
        <section className="panel p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                    <p className="eyebrow">{title}</p>
                    <h2 className="font-display text-2xl font-semibold text-[var(--text-strong)]">{subtitle}</h2>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function MetricCard({ label, value, accent }) {
    return (
        <article className={`metric-card metric-card-${accent}`}>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--text-dim)]">{label}</p>
            <p className="mt-3 font-display text-4xl font-bold text-[var(--text-strong)]">{value}</p>
        </article>
    );
}

function NoticeBanner({ notice }) {
    return (
        <div className={joinClasses('notice-banner', notice.tone === 'danger' ? 'notice-banner-danger' : 'notice-banner-success')}>
            <p className="text-sm font-medium">{notice.message}</p>
        </div>
    );
}

function EmptyState({ title, text }) {
    return (
        <div className="empty-state">
            <p className="font-display text-2xl font-semibold text-[var(--text-strong)]">{title}</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-soft)]">{text}</p>
        </div>
    );
}

function LoadingPanel({ label, compact = false }) {
    return (
        <div className={joinClasses('loading-shell', compact ? 'py-10' : 'py-20')}>
            <span className="loading-dot" />
            <p className="text-sm uppercase tracking-[0.34em] text-[var(--text-dim)]">{label}</p>
        </div>
    );
}

function LoadingSplash({ label }) {
    return (
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
            <section className="hero-shell max-w-xl items-center text-center">
                <span className="loading-dot" />
                <p className="eyebrow">Boot sequence</p>
                <h1 className="font-display text-4xl font-bold text-[var(--text-strong)]">Preparing the library console.</h1>
                <p className="text-sm leading-7 text-[var(--text-soft)]">{label}</p>
            </section>
        </div>
    );
}

function Pagination({ meta, onPageChange }) {
    if (!meta?.last_page || meta.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-soft)]">
                Showing {meta.from ?? 0} to {meta.to ?? 0} of {meta.total ?? 0}
            </p>
            <div className="flex items-center gap-3">
                <button
                    className="btn-ghost"
                    disabled={meta.current_page <= 1}
                    type="button"
                    onClick={() => onPageChange(meta.current_page - 1)}
                >
                    Previous
                </button>
                <span className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">
                    Page {meta.current_page} / {meta.last_page}
                </span>
                <button
                    className="btn-ghost"
                    disabled={meta.current_page >= meta.last_page}
                    type="button"
                    onClick={() => onPageChange(meta.current_page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function Field({ label, className = '', children }) {
    return (
        <label className={joinClasses('grid gap-2', className)}>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-dim)]">{label}</span>
            {children}
        </label>
    );
}

function TextInput({ className = '', ...props }) {
    return <input className={joinClasses('input', className)} {...props} />;
}

function SelectInput({ className = '', children, ...props }) {
    return (
        <select className={joinClasses('input', className)} {...props}>
            {children}
        </select>
    );
}

function Modal({ open, title, onClose, children, widthClassName = 'max-w-3xl' }) {
    if (!open) {
        return null;
    }

    return (
        <div className="modal-shell">
            <div className={joinClasses('modal-card', widthClassName)}>
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="eyebrow">Editor</p>
                        <h3 className="mt-2 font-display text-2xl font-semibold text-[var(--text-strong)]">{title}</h3>
                    </div>
                    <button className="btn-ghost" type="button" onClick={onClose}>
                        Close
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function FeatureTile({ label, text }) {
    return (
        <div className="glass-strip p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{text}</p>
        </div>
    );
}

function BookCover({ book, className = '' }) {
    if (book.cover_image) {
        return <img alt={book.title} className={joinClasses('object-cover shadow-soft', className)} src={book.cover_image} />;
    }

    return (
        <div
            className={joinClasses(
                'flex items-end rounded-[22px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] p-4',
                className,
            )}
        >
            <div>
                <p className="eyebrow">No cover</p>
                <p className="mt-2 font-display text-lg font-semibold text-[var(--text-strong)]">{truncate(book.title, 22)}</p>
            </div>
        </div>
    );
}

function StatusBadge({ value, tone = null }) {
    const resolvedTone = tone ?? badgeTone(value);

    return <span className={joinClasses('status-badge', `status-badge-${resolvedTone}`)}>{capitalize(value)}</span>;
}

function joinClasses(...values) {
    return values.filter(Boolean).join(' ');
}

function badgeTone(value) {
    const normalizedValue = String(value).toLowerCase();

    if (['active', 'available', 'returned'].includes(normalizedValue)) {
        return 'success';
    }

    if (['borrowed', 'directory'].includes(normalizedValue)) {
        return 'info';
    }

    if (['overdue', 'late', 'out of stock'].includes(normalizedValue)) {
        return 'warning';
    }

    if (['inactive'].includes(normalizedValue)) {
        return 'danger';
    }

    return 'neutral';
}

function extractMessage(error) {
    const response = error?.response?.data;

    if (response?.errors) {
        const firstError = Object.values(response.errors).flat()[0];

        if (firstError) {
            return firstError;
        }
    }

    if (typeof response?.message === 'string' && response.message.length > 0) {
        return response.message;
    }

    return error?.message ?? 'Something went wrong.';
}

function readStoredSession() {
    try {
        const session = window.localStorage.getItem(SESSION_KEY);

        return session ? JSON.parse(session) : null;
    } catch (error) {
        return null;
    }
}

function writeStoredSession(session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearStoredSession() {
    window.localStorage.removeItem(SESSION_KEY);
}

function readHashSection() {
    const rawHash = window.location.hash.replace('#', '');

    return NAV_ITEMS.some((item) => item.id === rawHash) ? rawHash : 'dashboard';
}

function formatDate(value) {
    if (!value) {
        return 'Not set';
    }

    const normalizedValue =
        typeof value === 'string' && value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(normalizedValue);
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(value));
}

function capitalize(value) {
    return String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name) {
    return String(name)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function todayAsInput() {
    return formatInputDate(new Date());
}

function offsetDate(days) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    return formatInputDate(nextDate);
}

function asInputDate(value) {
    return value ? String(value).slice(0, 10) : '';
}

function truncate(value, length) {
    if (!value || value.length <= length) {
        return value;
    }

    return `${value.slice(0, length)}...`;
}

function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
}

function revokePreview(url) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function formatInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
