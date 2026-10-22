import { useEffect } from 'react';
import { useLocation } from 'react-router';

const DEFAULT_TITLE = 'PrepMagnet — #1 Mock Test Platform for SSC CGL, Banking & Railway Exams';
const DEFAULT_DESC =
  "India's most advanced CBT mock test platform for SSC CGL, IBPS PO, SBI PO, RRB NTPC & State PSC. Official exam simulation, real-time percentile, and deep AI score analytics.";
const BASE_URL = 'https://prepmagnet.in';

function setMetaTag(selector, attrName, attrValue, content) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(url) {
  let link = document.querySelector("link[rel='canonical']");
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * useSEO — Dynamic Meta, Canonical & Open Graph tag manager for route-level SEO
 *
 * @param {Object} options
 * @param {string} options.title - The page-specific title
 * @param {string} [options.description] - The meta description
 * @param {string} [options.canonical] - Specific canonical URL (defaults to BASE_URL + pathname)
 * @param {string} [options.ogType] - OpenGraph type (website, article, etc.)
 * @param {string} [options.ogImage] - OpenGraph preview image URL
 */
export function useSEO({ title, description, canonical, ogType = 'website', ogImage } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Page Title
    const formattedTitle = title ? `${title} | PrepMagnet` : DEFAULT_TITLE;
    document.title = formattedTitle;

    // 2. Canonical URL
    const canonicalUrl = canonical || `${BASE_URL}${pathname === '/' ? '' : pathname}`;
    setCanonical(canonicalUrl);

    // 3. Meta Description
    const metaDesc = description || DEFAULT_DESC;
    setMetaTag("meta[name='description']", 'name', 'description', metaDesc);

    // 4. OpenGraph tags
    setMetaTag("meta[property='og:title']", 'property', 'og:title', formattedTitle);
    setMetaTag("meta[property='og:description']", 'property', 'og:description', metaDesc);
    setMetaTag("meta[property='og:url']", 'property', 'og:url', canonicalUrl);
    setMetaTag("meta[property='og:type']", 'property', 'og:type', ogType);
    if (ogImage) {
      setMetaTag("meta[property='og:image']", 'property', 'og:image', ogImage);
    }

    // 5. Twitter tags
    setMetaTag("meta[name='twitter:title']", 'name', 'twitter:title', formattedTitle);
    setMetaTag("meta[name='twitter:description']", 'name', 'twitter:description', metaDesc);
    if (ogImage) {
      setMetaTag("meta[name='twitter:image']", 'name', 'twitter:image', ogImage);
    }
  }, [title, description, canonical, ogType, ogImage, pathname]);
}
