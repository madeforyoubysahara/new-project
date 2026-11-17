'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUp, CheckCircle2, ChevronDown, Flower2, Gift, Heart, Instagram,
  Menu, MessageCircle, Minus, Plus, Scissors, Search, ShoppingBag, X,
} from 'lucide-react';
import { products as fallbackProducts, settings, orderUrl, type Product } from '../lib/catalog';
import { approvedReviews, type ApprovedReview } from '../lib/reviews';

type PublicContent = {
  announcement: string;
  hero_heading: string;
  hero_subtitle: string;
  about_text: string;
  footer_text: string;
  storefront_visible: boolean;
  featured_product_ids?: string[];
  faq?: Array<{ question: string; answer: string }>;
  business_name?: string;
  business_email?: string;
  seo_title?: string;
  seo_description?: string;
};

const defaultContent: PublicContent = {
  announcement: 'A little handmade love, just for you',
  hero_heading: 'Handmade with Love, Made Just for You.',
  hero_subtitle: 'Discover charming crochet flowers, adorable accessories and personalised little treasures — thoughtfully crafted by Sahara.',
  about_text: 'Welcome to Made for You by Sahara, a little creative space dedicated to handmade crochet creations. Every product is crafted with care, creativity, and a love for beautiful handmade details.',
  footer_text: 'Handmade with Love',
  storefront_visible: true,
};

const defaultFaqs = [
  ['Are your products handmade?', 'Yes! Our crochet creations are handmade with love.'],
  ['Can I choose different colours?', 'Yes, you can share your preferred colour. Availability is confirmed when we review your request.'],
  ['Do you accept custom orders?', 'Customisation is available for selected products, subject to confirmation.'],
  ['How do I place an order?', 'Choose a product and complete our Google Form. Sahara will contact you to confirm the details.'],
  ['How long will delivery take?', 'Delivery timing and charges are confirmed after reviewing your order and location.'],
  ['What payment methods do you accept?', 'Payment options are discussed when your order request is confirmed.'],
  ['What if my item arrives damaged or incorrect?', 'Email madeforyoubysahara@gmail.com promptly with your order details. We review concerns fairly and provide remedies in line with applicable consumer law.'],
  ['Can I cancel or return an order?', 'Requests are considered case by case, especially for personalised items. See our Ordering, Delivery, Cancellations & Returns policy for details.'],
];

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState('');
  const [customization, setCustomization] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(0);
  const [faq, setFaq] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [reviews, setReviews] = useState<ApprovedReview[]>(approvedReviews);
  const [content, setContent] = useState<PublicContent>(defaultContent);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    async function loadPublicData() {
      const [productResponse, reviewResponse, contentResponse] = await Promise.allSettled([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/reviews', { cache: 'no-store' }),
        fetch('/api/site', { cache: 'no-store' }),
      ]);
      if (!active) return;
      if (productResponse.status === 'fulfilled' && productResponse.value.ok) {
        const result = await productResponse.value.json() as { products: Product[] };
        if (Array.isArray(result.products)) setCatalog(result.products);
      } else if (productResponse.status === 'rejected') {
        console.error('Could not refresh the published product catalog.', productResponse.reason);
      }
      if (reviewResponse.status === 'fulfilled' && reviewResponse.value.ok) {
        const result = await reviewResponse.value.json() as { reviews: ApprovedReview[] };
        if (Array.isArray(result.reviews)) setReviews(result.reviews);
      } else if (reviewResponse.status === 'rejected') {
        console.error('Could not refresh published reviews.', reviewResponse.reason);
      }
      if (contentResponse.status === 'fulfilled' && contentResponse.value.ok) {
        const result = await contentResponse.value.json() as { content: PublicContent };
        if (result.content) {
          setContent(result.content);
          if (Array.isArray(result.content.featured_product_ids)) {
            setCatalog((current) => current.map((product) => ({
              ...product,
              featured: product.featured || result.content.featured_product_ids?.includes(product.id),
            })));
          }
          if (result.content.seo_title) document.title = result.content.seo_title;
          if (result.content.seo_description) {
            let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
            if (!description) {
              description = document.createElement('meta');
              description.name = 'description';
              document.head.append(description);
            }
            description.content = result.content.seo_description;
          }
        }
      } else if (contentResponse.status === 'rejected') {
        console.error('Could not refresh public website content.', contentResponse.reason);
      }
    }
    void loadPublicData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalCloseRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [selected]);

  const faqItems = content.faq?.length ? content.faq.map((item) => [item.question, item.answer]) : defaultFaqs;
  const visible = catalog.filter((product) =>
    (category === 'All' || product.category === category) &&
    `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const categories = ['All', ...Array.from(new Set(catalog.map((product) => product.category)))];

  function openProduct(product: Product) {
    setSelected(product);
    setQuantity(1);
    setColor('');
    setCustomization('');
    setNotes('');
    setPhoto(0);
    setMenu(false);
  }

  function order(product?: Product) {
    if (product?.available === false) {
      setNotice('This item is currently unavailable. Please contact Sahara to ask about availability.');
      return;
    }
    const url = orderUrl(product, quantity, color, notes, customization);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else setNotice('Ordering form is being connected. Please check back soon or use the contact details when available.');
  }

  if (!content.storefront_visible) {
    return <main className="storefront-closed"><Flower2 size={42}/><h1>{content.business_name ?? 'Made for You by Sahara'}</h1><p>Our little shop is taking a short break. Please check back soon.</p><a className="btn btn-outline" href={`mailto:${content.business_email ?? settings.email}`}>Contact us</a></main>;
  }

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="announcement">✿ {content.announcement} ✿</div>
    <header className="header">
      <a className="brand" href="#home" onClick={() => setMenu(false)}><span className="brand-icon">✿</span><span>Made for You<small>by Sahara ♡</small></span></a>
      <nav id="main-navigation" className={menu ? 'nav open' : 'nav'} aria-label="Main navigation">
        {['Home', 'Shop', 'Custom Orders', 'About', 'Reviews', 'Contact'].map((label) => <a key={label} href={`#${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMenu(false)}>{label}</a>)}
        <button className="btn btn-small" onClick={() => { setMenu(false); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}>Order Now <ArrowRight size={15}/></button>
      </nav>
      <button className="menu-button" aria-expanded={menu} aria-controls="main-navigation" aria-label="Toggle menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </header>

    <main id="main-content">
      <section className="hero" id="home">
        <div className="petal petal-a">✿</div><div className="petal petal-b">♡</div><div className="petal petal-c">✽</div>
        <div className="hero-content"><div className="eyebrow">✧ THE LITTLE HANDMADE BOUTIQUE ✧</div><h1>{content.hero_heading.includes(', ') ? <>{content.hero_heading.split(', ')[0]},<br/><em>{content.hero_heading.split(', ').slice(1).join(', ')}</em></> : content.hero_heading}</h1>
          <p>{content.hero_subtitle}</p><div className="hero-actions"><a href="#shop" className="btn">Explore Collection <ArrowRight size={18}/></a><a href="#custom-orders" className="btn btn-outline">Customise Your Order</a></div><div className="hero-note"><Heart size={17}/> Every stitch tells a story</div></div>
        <div className="hero-visual"><div className="hero-photo"><img src={catalog[0]?.images[0] ?? '/products/flower-keychain.jpeg'} alt={catalog[0]?.imageAlt?.[0] ?? 'Handmade crochet flower keychain'} fetchPriority="high"/></div><div className="floating-label">♡ handmade<br/>with love</div><div className="hero-flower">✿</div></div>
      </section>
      <section className="promises"><div><Heart/><strong>Handmade with Love</strong><span>Thoughtfully created</span></div><div><Scissors/><strong>Personalised for You</strong><span>Make it your own</span></div><div><Gift/><strong>Little Details, Big Smiles</strong><span>Sweet gifting ideas</span></div></section>
      <section className="section intro"><div className="eyebrow">HELLO, LOVELY ♡</div><h2>Welcome to our little world of <em>handmade happiness</em></h2><p>{content.about_text}</p><span className="separator">✿ ♡ ✿</span></section>
      <section className="section shop-section" id="shop"><div className="section-head"><div><div className="eyebrow">MADE WITH CARE, PICKED WITH LOVE</div><h2>Explore the <em>Collection</em></h2><p>Little handmade joys for you and your favourite people.</p></div><span className="section-flower">✿</span></div>
        <div className="shop-tools"><div className="filters">{categories.map((item) => <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something lovely..." aria-label="Search products"/></label></div>
        <div className="products">{visible.map((product) => <article className="product" key={product.id}><button className="product-photo" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}><img src={product.images[0]} alt={product.imageAlt?.[0] || `Handmade product photo of ${product.name}`}/>{product.featured && <span className="product-featured">Featured</span>}{product.available === false && <span className="product-unavailable">Currently unavailable</span>}<span className="product-heart">♡</span></button><div className="product-body"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>{product.tagline}</p><div className="product-bottom"><strong>₹{product.price} <small>each</small></strong><button className="circle-button" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}><ArrowRight size={20}/></button></div></div></article>)}</div>
        {visible.length === 0 && <p className="empty">No matching creations yet. Try another search ♡</p>}
      </section>
      <section className="custom-section" id="custom-orders"><div className="custom-icon">✿</div><div className="eyebrow">DREAM IT • LOVE IT • CUSTOMISE IT</div><h2>Your Imagination,<br/><em>Our Handmade Creation ♡</em></h2><p>Have a favourite colour or a special idea? Share your preferences and let us create something lovingly handmade for you. Custom requests are subject to confirmation.</p><button className="btn btn-cream" onClick={() => order()}>Request a Custom Order <ArrowRight size={17}/></button></section>
      <section className="section story" id="about"><div className="story-images"><div className="story-main"><img src="/products/garland-flat-product-only.png" alt="Handmade crochet flower hair garland photographed on a flat surface"/></div><div className="story-stamp">made with<br/>♡ love ♡</div></div><div className="story-copy"><div className="eyebrow">THE HEART BEHIND THE STITCHES</div><h2>Meet the hands<br/>behind the <em>magic</em></h2><h3>Hi, I'm Sahara! ♡</h3><p>{content.about_text}</p><p>From thoughtful gifts to everyday accessories, our aim is to make each creation feel personal and special.</p><div className="signature">With love, Sahara ♡</div></div></section>
      <section className="section steps"><div className="eyebrow">SIMPLE & SWEET</div><h2>How to <em>Order</em></h2><div className="steps-grid">{[['01','Choose your favourite','Explore our handmade collection.'],['02','Make it yours','Share your colour and customisation preferences.'],['03','Send your request','Complete our simple Google order form.'],['04','We confirm with you','Sahara will confirm details and delivery.']].map(([number, title, description]) => <div className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></div>)}</div></section>
      <section className="section reviews" id="reviews"><div className="eyebrow">KIND WORDS, HAPPY HEARTS</div><h2>Little Notes of <em>Love ♡</em></h2><p className="reviews-intro">Real experiences from our lovely customers, shared with their permission.</p>
        {reviews.length ? <div className="reviews-grid">{reviews.filter((review) => review.permissionConfirmed).map((review) => <article className="review-card" key={review.id}><div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div><blockquote>“{review.quote}”</blockquote><div className="review-author">— {review.displayName}</div>{(review.product || review.month) && <p className="review-meta">{[review.product, review.month].filter(Boolean).join(' · ')}</p>}</article>)}</div> : <div className="review-empty"><Heart size={32}/><h3>Your love means the world to us!</h3><p>Be the first to share your experience. We publish only genuine customer feedback with explicit permission.</p></div>}
        {settings.reviewForm ? <a className="btn review-cta" href={settings.reviewForm} target="_blank" rel="noopener noreferrer">Share Your Experience <ArrowRight size={17}/></a> : <p className="review-pending">Feedback form link will appear here once Sahara connects it.</p>}<p className="review-policy">Reviews are checked before publishing. Sharing feedback does not guarantee it will be displayed; contact details are never published.</p>
      </section>
      <section className="section faq-section" id="faq"><div className="eyebrow">QUESTIONS? WE'RE HERE ♡</div><h2>Frequently Asked <em>Questions</em></h2><div className="faq-list">{faqItems.map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faq === index} onClick={() => setFaq(faq === index ? null : index)}>{question}<ChevronDown className={faq === index ? 'rotated' : ''} size={20}/></button>{faq === index && <p>{answer}</p>}</div>)}</div></section>
      <section className="contact-section" id="contact"><div className="eyebrow">LET'S STAY CONNECTED</div><h2>Let's create something<br/><em>beautiful together ♡</em></h2><p>Have a question or a special handmade idea? We'd love to hear from you!</p><div className="contact-buttons">{settings.instagram && <a className="btn btn-outline" href={settings.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/> Instagram</a>}{settings.whatsapp && <a className="btn btn-outline" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> WhatsApp</a>}{(content.business_email || settings.email) && <a className="btn btn-outline" href={`mailto:${content.business_email || settings.email}`}>Email Us</a>}</div></section>
    </main>
    <footer className="footer"><div><a className="brand" href="#home"><span className="brand-icon">✿</span><span>Made for You<small>by Sahara ♡</small></span></a><p>{content.footer_text}<br/>Founder — Sahara</p></div><div><h4>Explore</h4><a href="#shop">Shop Collection</a><a href="#custom-orders">Custom Orders</a><a href="#about">Our Story</a><a href="#reviews">Customer Love</a></div><div><h4>Help & Information</h4><a href="#faq">FAQs</a><a href="#contact">Contact</a><a href="/privacy">Privacy Policy</a><a href="/delivery">Delivery & Returns</a></div><div className="footer-bottom">© {new Date().getFullYear()} {content.business_name ?? 'Made for You by Sahara'}. All rights reserved. ♡</div></footer>
    <a className="backtop" href="#home" aria-label="Back to top"><ArrowUp size={19}/></a>
    {selected && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-heading"><button ref={modalCloseRef} className="modal-close" aria-label="Close product details" onClick={() => setSelected(null)}><X/></button><div className="modal-gallery"><div className="modal-photo"><img src={selected.images[photo]} alt={selected.imageAlt?.[photo] || `Product photograph of ${selected.name}`}/></div>{selected.images.length > 1 && <div className="thumbnails">{selected.images.map((image, index) => <button key={image} className={photo === index ? 'thumb selected' : 'thumb'} onClick={() => setPhoto(index)} aria-label={`View product image ${index + 1}`}><img src={image} alt=""/></button>)}</div>}</div><div className="modal-info"><span className="eyebrow">HANDMADE WITH LOVE ♡</span><h2 id="product-heading">{selected.name}</h2><strong className="modal-price">₹{selected.price} each</strong><p>{selected.description}</p><div className="detail-label">Quantity</div><div className="quantity"><button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(Math.min(99, quantity + 1))}><Plus size={16}/></button></div><label className="detail-label" htmlFor="color">Preferred colour or combination</label><input id="color" className="field" value={color} onChange={(event) => setColor(event.target.value)} placeholder={selected.colors || 'e.g. Pink & white (subject to confirmation)'}/>{selected.custom && <><label className="detail-label" htmlFor="customization">Customisation {selected.customOptions?.length ? `(${selected.customOptions.join(', ')})` : ''}</label><input id="customization" className="field" value={customization} onChange={(event) => setCustomization(event.target.value)} placeholder="Describe the customisation you would like"/></>}<label className="detail-label" htmlFor="notes">Additional notes (optional)</label><textarea id="notes" className="field" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Tell us your idea..."/><div className="subtotal" aria-live="polite">Estimated product subtotal <strong>₹{selected.price * quantity}</strong></div><p className="fineprint">Delivery and customisation charges, if any, will be confirmed separately.</p>{selected.orderFormAvailable === false && <p className="admin-form-note">This product may not yet be a selectable Google Form option. The request name will be included in the notes field where configured.</p>}<button className="btn modal-order" disabled={selected.available === false} onClick={() => order(selected)}>{selected.available === false ? 'Currently unavailable' : 'Order Now'} <ShoppingBag size={18}/></button></div></section></div>}
    {notice && <div className="toast" role="status"><CheckCircle2 size={18}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={17}/></button></div>}
  </>;
}
