
"use strict";

// DATA STORAGE
const STORAGE_KEY = "miniTwitterData_v1";
const SESSION_KEY = "miniTwitterSession_v1";

let mode = "register";
let currentUser = localStorage.getItem(SESSION_KEY) || "";

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (saved && Array.isArray(saved.users) &&
            Array.isArray(saved.posts)) {
            return saved;
        }
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    return { users: [], posts: [] };
}

let data = loadData();

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function findUser(username) {
    return data.users.find(user => user.username === username);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

// HTML ELEMENTS
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authButton = document.getElementById("authButton");
const nameField = document.getElementById("nameField");
const nameInput = document.getElementById("nameInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const message = document.getElementById("message");
const switchText = document.getElementById("switchText");
const switchLink = document.getElementById("switchLink");

const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");
const followerCount = document.getElementById("followerCount");
const followingCount = document.getElementById("followingCount");

const postForm = document.getElementById("postForm");
const postInput = document.getElementById("postInput");
const feed = document.getElementById("feed");
const searchInput = document.getElementById("searchInput");
const peopleList = document.getElementById("peopleList");

// LOGIN / REGISTER MODE
function setMode(newMode) {
    mode = newMode;

    authTitle.textContent =
        mode === "register" ? "Create Account" : "Login";

    authButton.textContent =
        mode === "register" ? "Register" : "Login";

    nameField.classList.toggle("hidden", mode !== "register");
    nameInput.required = mode === "register";
    message.textContent = "";

    switchText.firstChild.textContent =
        mode === "register"
            ? "Already have an account? "
            : "New here? ";

    switchLink.textContent =
        mode === "register" ? "Login" : "Register";
}

switchLink.addEventListener("click", function(event) {
    event.preventDefault();
    setMode(mode === "register" ? "login" : "register");
});

// REGISTER AND LOGIN
authForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        message.textContent =
            "Username must be 3-20 characters (letters, numbers, underscore).";
        return;
    }

    if (password.length < 4) {
        message.textContent =
            "Password must contain at least 4 characters.";
        return;
    }

    if (mode === "register") {
        if (!name) {
            message.textContent = "Please enter your name.";
            return;
        }

        if (findUser(username)) {
            message.textContent =
                "Username already exists. Please login.";
            return;
        }

        data.users.push({
            username: username,
            name: name,
            password: password,
            following: [],
            followers: []
        });

        saveData();
        loginUser(username);

    } else {
        const user = findUser(username);

        if (!user || user.password !== password) {
            message.textContent = "Incorrect username or password.";
            return;
        }

        loginUser(username);
    }

    authForm.reset();
});

function loginUser(username) {
    currentUser = username;
    localStorage.setItem(SESSION_KEY, currentUser);
    message.textContent = "";
    showApp();
}

// LOGOUT
document.getElementById("logoutButton")
    .addEventListener("click", function() {
        currentUser = "";
        localStorage.removeItem(SESSION_KEY);
        showAuth();
    });

function showAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
}

function showApp() {
    const user = findUser(currentUser);

    if (!user) {
        currentUser = "";
        localStorage.removeItem(SESSION_KEY);
        showAuth();
        return;
    }

    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    renderAll();
}

// CREATE POST
postForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const text = postInput.value.trim();

    if (!text || !findUser(currentUser)) return;

    data.posts.unshift({
        id: makeId(),
        username: currentUser,
        text: text,
        createdAt: new Date().toISOString(),
        likes: [],
        comments: []
    });

    saveData();
    postInput.value = "";
    renderAll();
});

// FOLLOW / UNFOLLOW
function toggleFollow(targetUsername) {
    if (targetUsername === currentUser) return;

    const me = findUser(currentUser);
    const target = findUser(targetUsername);

    if (!me || !target) return;

    const index = me.following.indexOf(targetUsername);

    if (index >= 0) {
        me.following.splice(index, 1);
    } else {
        me.following.push(targetUsername);
    }

    target.followers = data.users
        .filter(user => user.following.includes(targetUsername))
        .map(user => user.username);

    saveData();
    renderAll();
}

// LIKE / UNLIKE
function toggleLike(postId) {
    const post = data.posts.find(item => item.id === postId);

    if (!post) return;

    if (!Array.isArray(post.likes)) post.likes = [];

    const index = post.likes.indexOf(currentUser);

    if (index >= 0) {
        post.likes.splice(index, 1);
    } else {
        post.likes.push(currentUser);
    }

    saveData();
    renderAll();
}

// ADD COMMENT
function addComment(postId) {
    const input = document.getElementById("comment-" + postId);

    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const post = data.posts.find(item => item.id === postId);

    if (!post) return;

    if (!Array.isArray(post.comments)) post.comments = [];

    post.comments.push({
        username: currentUser,
        text: text,
        createdAt: new Date().toISOString()
    });

    saveData();
    renderAll();
}

// SHARE POST
function sharePost(postId) {
    const post = data.posts.find(item => item.id === postId);

    if (!post) return;

    const author = findUser(post.username);
    const text = "@" +
        (author ? author.username : post.username) + ": " + post.text;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => alert("Post copied! You can share it now."))
            .catch(() => window.prompt("Copy this post:", text));
    } else {
        window.prompt("Copy this post:", text);
    }
}

// RENDER ALL
function renderAll() {
    const me = findUser(currentUser);

    if (!me) return;

    profileName.textContent = me.name;
    profileUsername.textContent = "@" + me.username;

    postCount.textContent = data.posts.filter(
        post => post.username === currentUser
    ).length;

    followerCount.textContent = data.users.filter(
        user => user.following.includes(currentUser)
    ).length;

    followingCount.textContent = me.following.length;

    renderPeople();
    renderFeed();
}

// RENDER PEOPLE
function renderPeople() {
    const query = searchInput.value.trim().toLowerCase();

    const people = data.users.filter(user =>
        user.username !== currentUser &&
        (user.username.includes(query) ||
         user.name.toLowerCase().includes(query))
    );

    if (people.length === 0) {
        peopleList.innerHTML =
            "<p class='muted'>No other users found. Create another account to test following.</p>";
        return;
    }

    peopleList.innerHTML = people.map(user => {
        const isFollowing =
            findUser(currentUser).following.includes(user.username);

        const followers = data.users.filter(
            item => item.following.includes(user.username)
        ).length;

        return `
            <div class="post">
                <div class="row">
                    <div>
                        <strong>${escapeHTML(user.name)}</strong>
                        <div class="muted">
                            @${escapeHTML(user.username)} · ${followers} followers
                        </div>
                    </div>

                    <button data-follow="${escapeHTML(user.username)}">
                        ${isFollowing ? "Unfollow" : "Follow"}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// RENDER FEED
function renderFeed() {
    const me = findUser(currentUser);

    const visiblePosts = data.posts.filter(post =>
        post.username === currentUser ||
        me.following.includes(post.username)
    );

    if (visiblePosts.length === 0) {
        feed.innerHTML =
            "<p class='muted'>No posts yet. Create a post or follow someone to see their posts here.</p>";
        return;
    }

    feed.innerHTML = visiblePosts.map(post => {
        const author = findUser(post.username);
        const authorName = author ? author.name : post.username;

        const likes = Array.isArray(post.likes) ? post.likes : [];
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const liked = likes.includes(currentUser);
        const date = new Date(post.createdAt).toLocaleString();

        const commentsHTML = comments.map(comment => `
            <div class="comment">
                <strong>@${escapeHTML(comment.username)}</strong>
                ${escapeHTML(comment.text)}
            </div>
        `).join("");

        return `
            <article class="post">
                <strong>${escapeHTML(authorName)}</strong>

                <div class="muted">
                    @${escapeHTML(post.username)} · ${escapeHTML(date)}
                </div>

                <p>${escapeHTML(post.text)}</p>

                <button data-like="${escapeHTML(post.id)}"
                    class="${liked ? "danger" : ""}">
                    ${liked ? "Unlike" : "Like"} (${likes.length})
                </button>

                <button data-share="${escapeHTML(post.id)}"
                    class="secondary">Share</button>

                <div style="margin-top:10px">
                    <input id="comment-${escapeHTML(post.id)}"
                        placeholder="Write a comment...">

                    <button data-comment="${escapeHTML(post.id)}">
                        Comment
                    </button>
                </div>

                <div>${commentsHTML}</div>
            </article>
        `;
    }).join("");
}

// BUTTON CLICK HANDLERS
peopleList.addEventListener("click", function(event) {
    const button = event.target.closest("[data-follow]");

    if (button) {
        toggleFollow(button.dataset.follow);
    }
});

feed.addEventListener("click", function(event) {
    const likeButton = event.target.closest("[data-like]");
    const shareButton = event.target.closest("[data-share]");
    const commentButton = event.target.closest("[data-comment]");

    if (likeButton) {
        toggleLike(likeButton.dataset.like);
    }

    if (shareButton) {
        sharePost(shareButton.dataset.share);
    }

    if (commentButton) {
        addComment(commentButton.dataset.comment);
    }
});

searchInput.addEventListener("input", renderPeople);

// START APPLICATION
if (currentUser && findUser(currentUser)) {
    showApp();
} else {
    currentUser = "";
    showAuth();
    setMode("register");
}
