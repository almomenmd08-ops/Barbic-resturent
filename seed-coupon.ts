import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const snapshot = await getDocs(collection(db, 'coupons'));
  if (!snapshot.empty) {
    console.log("Coupons already exist.");
    return;
  }
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1); // 1 month from now
  await addDoc(collection(db, 'coupons'), {
    title: 'Welcome Offer',
    code: 'WELCOME50',
    description: 'Get Flat ₹50 OFF on your first order. Use code WELCOME50 at checkout.',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 200,
    expiryDate: expiry.toISOString(),
    active: true,
    displayOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log("Coupon added!");
  process.exit(0);
}

seed();
