/**
 * Type-Safe Schema.org JSON-LD Structured Data Builder
 * Adheres to Google Rich Results guidelines and Schema.org specifications.
 */

export interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo: string;
  description?: string;
  sameAs?: string[]; // Social media profile URLs
  contactPoint?: {
    telephone: string;
    contactType: string;
    areaServed?: string;
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  imageUrl: string;
  datePublished: string; // ISO 8601
  dateModified: string;  // ISO 8601
  authorName: string;
  publisherName: string;
  publisherLogoUrl: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ProductSchemaProps {
  name: string;
  description: string;
  image: string[];
  sku: string;
  brand: string;
  price: number;
  currency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  url: string;
  ratingValue?: number;
  reviewCount?: number;
}

/**
 * Generate Organization JSON-LD Schema
 */
export function generateOrganizationSchema(props: OrganizationSchemaProps): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: props.name,
    url: props.url,
    logo: props.logo,
    ...(props.description ? { description: props.description } : {}),
    ...(props.sameAs && props.sameAs.length > 0 ? { sameAs: props.sameAs } : {}),
    ...(props.contactPoint
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: props.contactPoint.telephone,
            contactType: props.contactPoint.contactType,
            areaServed: props.contactPoint.areaServed ?? 'Global',
          },
        }
      : {}),
  };
}

/**
 * Generate BreadcrumbList JSON-LD Schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Article / BlogPosting JSON-LD Schema
 */
export function generateArticleSchema(props: ArticleSchemaProps): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: props.headline,
    description: props.description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
    image: props.imageUrl,
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    author: {
      '@type': 'Person',
      name: props.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: props.publisherName,
      logo: {
        '@type': 'ImageObject',
        url: props.publisherLogoUrl,
      },
    },
  };
}

/**
 * Generate FAQPage JSON-LD Schema
 */
export function generateFAQSchema(faqs: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Product with Offer and AggregateRating JSON-LD Schema
 */
export function generateProductSchema(props: ProductSchemaProps): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.name,
    description: props.description,
    image: props.image,
    sku: props.sku,
    brand: {
      '@type': 'Brand',
      name: props.brand,
    },
    offers: {
      '@type': 'Offer',
      url: props.url,
      priceCurrency: props.currency,
      price: props.price.toFixed(2),
      availability: `https://schema.org/${props.availability}`,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  if (props.ratingValue && props.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: props.ratingValue,
      reviewCount: props.reviewCount,
    };
  }

  return schema;
}

/**
 * Helper to serialize JSON-LD for injection into <script type="application/ld+json">
 */
export function serializeJsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema, null, 2);
}
