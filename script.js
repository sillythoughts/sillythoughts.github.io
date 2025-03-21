const firebaseConfig = {
  apiKey: "AIzaSyCkJVGbmu1s4ChCjt5Cr2_l6ewARvpR77Y",
  authDomain: "rant-123.firebaseapp.com",
  projectId: "rant-123",
  storageBucket: "rant-123.appspot.com",
  messagingSenderId: "543799594406",
  appId: "1:543799594406:web:569979efef782a46f3d367",
  measurementId: "G-RW7GHB612T"
};
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// Add these variables at the top of your script.js file, near other global variables
let isAuthenticated = false;
const ADMIN_PASSCODE = "kissmunaboss"; // Change this to your desired passcode

// Pagination variables
const POSTS_PER_PAGE = 5;
let currentPage = 1;
let totalPages = 1;
let totalPosts = 0;

function showForm() {
  document.querySelector('.form-container').classList.add('active');
}

function closeForm() {
  document.querySelector('.form-container').classList.remove('active');
  document.getElementById('postInput').value = '';
  const editPostButton = document.getElementById('editPostButton');
  if (editPostButton) {
    editPostButton.remove();
  }
  const postButton = document.getElementById('postButton');
  if (!postButton) {
    const newPostButton = document.createElement('button');
    newPostButton.textContent = 'Post';
    newPostButton.id = 'postButton';
    newPostButton.onclick = addPost;
    document.querySelector('.form').appendChild(newPostButton);
  }
}

function formatDate(date) {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return new Date(date).toLocaleString('en-US', options);
}

function addPost() {
  const postInput = document.getElementById('postInput');
  const postText = postInput.value.trim();
  if (postText !== '') {
    firestore.collection('posts').add({
        text: postText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        datenow: new Date().toISOString() // Store date as ISO string
      })
      .then(() => {
        postInput.value = '';
        closeForm();
        fetchTotalPosts().then(() => {
          currentPage = 1;
          fetchPagedPosts(currentPage);
        });
      })
      .catch((error) => {
        console.error('Error adding document: ', error);
      });
  }
}

function deletePost(postId) {
  firestore.collection('posts').doc(postId).delete()
    .then(() => {
      console.log('Document successfully deleted!');
      fetchTotalPosts().then(() => {
        if (currentPage > totalPages && currentPage > 1) {
          currentPage--;
        }
        fetchPagedPosts(currentPage);
      });
    })
    .catch((error) => {
      console.error('Error removing document: ', error);
    });
}

function editPost(post) {
  showForm();
  const postInput = document.getElementById('postInput');
  postInput.value = post.data().text;

  const postButton = document.getElementById('postButton');
  if (postButton) {
    postButton.remove();
  }

  const editPostButton = document.createElement('button');
  editPostButton.textContent = 'Update Post';
  editPostButton.id = 'editPostButton';
  editPostButton.onclick = () => {
    const updatedText = postInput.value.trim();
    if (updatedText !== '') {
      firestore.collection('posts').doc(post.id).update({
          text: updatedText,
        })
        .then(() => {
          closeForm();
          fetchPagedPosts(currentPage);
        })
        .catch((error) => {
          console.error('Error updating document: ', error);
        });
    }
  };

  document.querySelector('.form').appendChild(editPostButton);
}

// Modify the displayPosts function to respect authentication status
function displayPosts(posts) {
  const postList = document.getElementById('postList');
  postList.innerHTML = '';

  posts.forEach((post) => {
    const postItem = document.createElement('li');
    postItem.className = 'postItem';

    const deleteButton = document.createElement('button');
    deleteButton.className = "button delete";
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deletePost(post.id);
    deleteButton.style.display = isAuthenticated ? 'block' : 'none';

    const editButton = document.createElement('button');
    editButton.className = "button edit";
    editButton.textContent = 'Edit';
    editButton.onclick = () => editPost(post);
    editButton.style.display = isAuthenticated ? 'block' : 'none';

    const postDate = post.data().datenow ? formatDate(post.data().datenow) : 'Date unavailable';

    postItem.innerHTML = `
    <div>
    <span>${post.data().text}</span>
    <span class="date">${postDate}</span>
    </div>
    `;
    postItem.appendChild(deleteButton);
    postItem.appendChild(editButton);
    postList.appendChild(postItem);
  });

  updatePaginationControls();
}


function fetchTotalPosts() {
  return firestore.collection('posts').get()
    .then((snapshot) => {
      totalPosts = snapshot.size;
      totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
      return totalPages;
    })
    .catch((error) => {
      console.error('Error getting total posts count:', error);
      return 1;
    });
}

function fetchPagedPosts(pageNumber) {
  if (pageNumber < 1) pageNumber = 1;
  if (pageNumber > totalPages) pageNumber = totalPages;

  currentPage = pageNumber;

  return firestore.collection('posts')
    .orderBy('timestamp', 'desc')
    .limit(POSTS_PER_PAGE * pageNumber)
    .get()
    .then((snapshot) => {
      // Get the last POSTS_PER_PAGE documents
      const startIndex = (pageNumber - 1) * POSTS_PER_PAGE;
      const endIndex = Math.min(startIndex + POSTS_PER_PAGE, snapshot.docs.length);
      const pagedDocs = snapshot.docs.slice(startIndex, endIndex);

      displayPosts(pagedDocs);
    })
    .catch((error) => {
      console.error('Error fetching posts for page:', error);
    });
}

function updatePaginationControls() {
  const paginationContainer = document.getElementById('paginationContainer');
  paginationContainer.innerHTML = '';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'pagination-button';
  prevButton.textContent = 'Previous';
  prevButton.disabled = currentPage <= 1;
  prevButton.onclick = () => {
    if (currentPage > 1) {
      fetchPagedPosts(currentPage - 1);
    }
  };
  paginationContainer.appendChild(prevButton);

  // Page indicator
  const pageIndicator = document.createElement('span');
  pageIndicator.className = 'page-indicator';
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationContainer.appendChild(pageIndicator);

  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'pagination-button';
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage >= totalPages;
  nextButton.onclick = () => {
    if (currentPage < totalPages) {
      fetchPagedPosts(currentPage + 1);
    }
  };
  paginationContainer.appendChild(nextButton);

  // Jump to page form
  const jumpForm = document.createElement('div');
  jumpForm.className = 'jump-form';

  const jumpInput = document.createElement('input');
  jumpInput.type = 'number';
  jumpInput.min = 1;
  jumpInput.max = totalPages;
  jumpInput.value = currentPage;
  jumpInput.className = 'jump-input';

  const jumpButton = document.createElement('button');
  jumpButton.textContent = 'Go';
  jumpButton.className = 'jump-button';
  jumpButton.onclick = () => {
    const pageNum = parseInt(jumpInput.value);
    if (pageNum >= 1 && pageNum <= totalPages) {
      fetchPagedPosts(pageNum);
    }
  };

  jumpForm.appendChild(jumpInput);
  jumpForm.appendChild(jumpButton);
  paginationContainer.appendChild(jumpForm);
}

// Add this function to show the passcode prompt
function showPasscodePrompt() {
  const passcode = prompt("Enter admin passcode:");
  if (passcode === ADMIN_PASSCODE) {
    isAuthenticated = true;
    updateButtonVisibility();
    alert("Authentication successful! You can now edit and manage posts.");
  } else if (passcode !== null) { // Only show error if user didn't press Cancel
    alert("Incorrect passcode!");
  }
}

// Add this function to update button visibility based on authentication status
function updateButtonVisibility() {
  const buttons = document.querySelectorAll('.button');
  const showFormBtn = document.querySelector('.show-form-btn');

  buttons.forEach(button => {
    button.style.display = isAuthenticated ? 'block' : 'none';
  });

  showFormBtn.style.display = isAuthenticated ? 'block' : 'none';
}

// Modify the initApp function to set initial button visibility
function initApp() {
  // Add login button to the page
  addLoginButton();

  // Hide add post button initially
  const showFormBtn = document.querySelector('.show-form-btn');
  showFormBtn.style.display = 'none';

  // Fetch posts and set up pagination
  fetchTotalPosts().then(() => {
    fetchPagedPosts(currentPage);
  });
}

// Add this function to create a login button
function addLoginButton() {
  const loginButton = document.createElement('button');
  loginButton.textContent = isAuthenticated ? 'Logout' : 'Admin Login';
  loginButton.className = 'admin-login-btn';
  loginButton.onclick = () => {
    if (isAuthenticated) {
      isAuthenticated = false;
      loginButton.textContent = 'Admin Login';
      updateButtonVisibility();
      alert("Logged out successfully");
    } else {
      showPasscodePrompt();
      if (isAuthenticated) {
        loginButton.textContent = 'Logout';
      }
    }
  };

  document.body.appendChild(loginButton);
}


document.addEventListener('DOMContentLoaded', initApp);