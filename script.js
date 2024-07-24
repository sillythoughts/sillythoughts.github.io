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

let lastVisible = null;
let isLoading = false;

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
      fetchInitialPosts();
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
    fetchInitialPosts();
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
        fetchInitialPosts();
      })
      .catch((error) => {
        console.error('Error updating document: ', error);
      });
    }
  };

  document.querySelector('.form').appendChild(editPostButton);
}

function appendFetchedPosts(posts) {
  const postList = document.getElementById('postList');
  posts.forEach((post) => {
    const postItem = document.createElement('li');
    postItem.className = 'postItem';

    const deleteButton = document.createElement('button');
    deleteButton.className = "button delete";
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deletePost(post.id);

    const editButton = document.createElement('button');
    editButton.className = "button edit";
    editButton.textContent = 'Edit';
    editButton.onclick = () => editPost(post);

    const postDate = post.data().datenow ? formatDate(post.data().datenow): 'Date unavailable';

    postItem.innerHTML = `
    <span>${post.data().text}</span>
    <span class="date">${postDate}</span>
    `;
    postItem.appendChild(deleteButton);
    postItem.appendChild(editButton);
    postList.appendChild(postItem);
  });
}

function fetchInitialPosts() {
  firestore.collection('posts')
  .orderBy('timestamp', 'desc')
  .limit(7)
  .onSnapshot((snapshot) => {
    const postList = document.getElementById('postList');
    postList.innerHTML = '';
    appendFetchedPosts(snapshot.docs);
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
  });
}

function fetchMorePosts() {
  if (lastVisible && !isLoading) {
    isLoading = true;
    firestore.collection('posts')
    .orderBy('timestamp', 'desc')
    .startAfter(lastVisible)
    .limit(5)
    .get()
    .then((snapshot) => {
      appendFetchedPosts(snapshot.docs);
      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      isLoading = false;
    })
    .catch((error) => {
      console.error('Error fetching more posts: ', error);
      isLoading = false;
    });
  }
}

window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
    fetchMorePosts();
  }
});

fetchInitialPosts();