const emailInput = document.querySelector('#emailInput');
const submitButton = document.querySelector('#submitButton');
const defaultPlaceholder = emailInput.placeholder;
const collectionsContainer = document.querySelector('#collectionsContainer');
const randomImage = document.querySelector('#randomImage');
const nextImageButton = document.querySelector('#nextImageButton');
const noImagesMessage = document.querySelector('#noImagesMessage');
const imageLoadingMessage = document.querySelector('#imageLoadingMessage');
const duplicateMessage = document.querySelector('#duplicateMessage');

const collectionsStorageKey = 'image-assignment-collections'; // Keep saved collections under a consistent browser-storage key.
const collections = loadCollections(); // Restore this browser's saved collections when the page starts.
let picsumImages = [];
let currentImageId = null;

function loadCollections() {
    try {
        const savedCollections = localStorage.getItem(collectionsStorageKey); // Read the saved JSON string from localStorage.
        if (savedCollections === null) return []; // Start with no collections on the first visit.

        const parsedCollections = JSON.parse(savedCollections); // Turn the saved JSON string back into JavaScript data.
        if (!Array.isArray(parsedCollections) || !parsedCollections.every(collection =>
            collection &&
            typeof collection.email === 'string' &&
            Array.isArray(collection.images) &&
            collection.images.every(imageUrl => typeof imageUrl === 'string')
        )) {
            throw new Error('Saved collections have an invalid format.');
        }

        return parsedCollections;
    } catch (error) {
        console.error('Could not load saved collections.', error); // Report invalid data or unavailable browser storage.
        return [];
    }
}

randomImage.addEventListener('load', () => {
    randomImage.hidden = false;
    imageLoadingMessage.hidden = true;
});

randomImage.addEventListener('error', () => {
    imageLoadingMessage.textContent = 'Could not load image. Please try again.';
    imageLoadingMessage.hidden = false;
});

nextImageButton.disabled = true;
submitButton.disabled = true;

nextImageButton.addEventListener('click', showNextImage);

loadPicsumImages().catch(error => {
    console.error('Could not load images from Picsum.', error);
});

emailInput.addEventListener('focus', () => {
    emailInput.placeholder = '';
});

emailInput.addEventListener('blur', () => {
    if (emailInput.value === '') {
        emailInput.placeholder = defaultPlaceholder;
    }
});

emailInput.addEventListener('input', () => {
    duplicateMessage.hidden = true;
});

submitButton.addEventListener('click', () => {
    if (!emailInput.reportValidity()) return;

    const email = emailInput.value.trim().toLowerCase();
    let collection = collections.find(collection => collection.email === email);

    if (!collection) {
        collection = {
            email: email,
            images: [],
        };
        collections.push(collection);
    }

    if (collection.images.includes(randomImage.src)) {
        duplicateMessage.hidden = false;
        return;
    }

    collection.images.push(randomImage.src);
    localStorage.setItem(collectionsStorageKey, JSON.stringify(collections)); // Save the updated collections so they survive a refresh.
    duplicateMessage.hidden = true;
    renderCollections();
});

async function loadPicsumImages() {
    const response = await fetch('https://picsum.photos/v2/list?page=1&limit=100');

    if (!response.ok) {
        throw new Error(`Picsum request failed with status ${response.status}.`);
    }

    picsumImages = await response.json();

    if (picsumImages.length === 0) {
        throw new Error('Picsum returned no images.');
    }

    showNextImage();
    nextImageButton.disabled = false;
    submitButton.disabled = false;
}

function showNextImage() {
    duplicateMessage.hidden = true;
    const availableImages = picsumImages.filter(image => image.id !== currentImageId);
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const image = availableImages[randomIndex];

    currentImageId = image.id;
    const dimensions = getImageDimensions();
    randomImage.src = `https://picsum.photos/id/${image.id}/${dimensions.width}/${dimensions.height}`;
    randomImage.alt = `Photo by ${image.author}`;
}

function getImageDimensions() {
    const imageFrame = randomImage.parentElement;
    const frame = imageFrame.getBoundingClientRect();
    const hasDesktopFrame = getComputedStyle(imageFrame).display === 'flex';
    const aspectRatio = hasDesktopFrame && frame.width > 0 && frame.height > 0
        ? frame.width / frame.height
        : 3 / 2;
    const width = 1920;

    return {
        width,
        height: Math.round(width / aspectRatio),
    };
}

function renderCollections() {
    collectionsContainer.replaceChildren();
    if (collections.length > 0) noImagesMessage.remove(); // Keep the empty-state message until at least one collection exists.

    collections.forEach(collection => {
        const collectionElement = document.createElement('div');
        collectionElement.className = 'email-collection';

        const heading = document.createElement('h3');
        heading.textContent = collection.email;

        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'collection-images';

        collection.images.forEach(imageUrl => {
            const imageWrapper = document.createElement('div'); // Group each image with its delete control for overlay positioning.
            imageWrapper.className = 'collection-image';

            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = `Image assigned to ${collection.email}`;

            const imageDelete = document.createElement('button');
            imageDelete.type = 'button';
            imageDelete.className = 'delete-image';
            imageDelete.setAttribute('aria-label', `Delete image from ${collection.email}`);
            imageDelete.textContent = '×'; // Show a red X while keeping the button accessible by name.
            imageDelete.addEventListener('click', () => {
                const imageIndex = collection.images.indexOf(imageUrl);
                if (imageIndex === -1) return;

                collection.images.splice(imageIndex, 1); // Remove this image from its collection.
                if (collection.images.length === 0) {
                    collections.splice(collections.indexOf(collection), 1); // Remove the collection when its last image is deleted.
                }

                localStorage.setItem(collectionsStorageKey, JSON.stringify(collections)); // Persist the deletion across refreshes.
                renderCollections();
            });

            imageWrapper.append(image, imageDelete);
            imagesContainer.append(imageWrapper);
        });

        collectionElement.append(heading, imagesContainer);
        collectionsContainer.append(collectionElement);
    });

    if (collections.length === 0 && noImagesMessage.parentElement === null) {
        collectionsContainer.parentElement.insertBefore(noImagesMessage, collectionsContainer); // Restore the empty state after the last image is deleted.
    }
}

renderCollections(); // Display restored collections immediately after the page loads.