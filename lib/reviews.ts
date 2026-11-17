/** Public, manually approved testimonials only. Never put contact details or order IDs here. */
export type ApprovedReview = {
  id: string;
  displayName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  product?: string;
  month?: string;
  permissionConfirmed: true;
};

/** Add entries only after checking the private feedback sheet and explicit publishing consent. */
export const approvedReviews: ApprovedReview[] = [];
