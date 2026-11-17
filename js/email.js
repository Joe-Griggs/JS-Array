const emailInput = document.querySelector('#emailInput');
const submitButton = document.querySelector('#submitButton');
const defaultPlaceholder = emailInput.placeholder;
const collectionsContainer = document.querySelector('#collectionsContainer');
const randomImage = document.querySelector('#randomImage');
const nextImageButton = document.querySelector('#nextImageButton');
const noImagesMessage = document.querySelector('#noImagesMessage');
const imageLoadingMessage = document.querySelector('#imageLoadingMessage');
const duplicateMessage = document.querySelector('#duplicateMessage');

const collections = [];
let picsumImages = [];
let currentImageId = null;

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
    duplicateMessage.hidden = true;
    renderCollections();
    emailInput.value = '';
    emailInput.placeholder = defaultPlaceholder;
    showNextImage();
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
    noImagesMessage.remove();


    collections.forEach(collection => {
        const collectionElement = document.createElement('div');
        collectionElement.className = 'email-collection';

        const heading = document.createElement('h3');
        heading.textContent = collection.email;

        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'collection-images';

        collection.images.forEach(imageUrl => {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = `Image assigned to ${collection.email}`;
            imagesContainer.append(image);
        });

        collectionElement.append(heading, imagesContainer);
        collectionsContainer.append(collectionElement);
    });
}