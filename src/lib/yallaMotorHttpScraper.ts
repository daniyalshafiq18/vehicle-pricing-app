export interface Flow3ScrapeResult {
  success: true;
  make: string;
  model: string;
  trim: string;
  year: number;
  count: number;
  minPrice: number;
  maxPrice: number;
  heading: string;
  sourceUrl: string;
}
 
export interface Flow3ErrorResult {
  success: false;
  error: string;
  url?: string;
  statusCode?: string;
}
 
export type Flow3Response = Flow3ScrapeResult | Flow3ErrorResult;
 
/**
 * Call the internal Power Pages server logic proxy using your working layout configuration pattern.
 */
export async function scrapeViaFlow3(params: {
  make: string;
  model: string;
  trim: string;
  year: number;
}): Promise<Flow3Response> {
  try {
    // 1. Grab the verification token using your working query selector pattern
    const tokenElement = document.querySelector("input[name='__RequestVerificationToken']") as HTMLInputElement;
const token = tokenElement?.value;

// 2. Call the server logic endpoint running on the portal backend via POST
// 💡 URL FIXED: Changed 'serverlogics' to 'serverlogic'
const response = await fetch('/_api/serverlogics/Web-Scraper', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    '__RequestVerificationToken': token || "" // Blends your exact fallback strategy
  }, 
  body: JSON.stringify({
    make: params.make,
    model: params.model,
    trim: params.trim,
    year: params.year,
  }),
});
 
 
    if (response.ok) {
      const result = await response.json();
      let payload = result;
      
      // Follows your exact nested string evaluation style if the backend packs it into a .data string
      if (result.data) {
        try {
          payload = JSON.parse(result.data);
        } catch (e) { /* Fallback if already an object */ }
      }
      
      return payload as Flow3Response;
    } else {
      return { 
        success: false, 
        error: `Server logic proxy request failed with status: ${response.status}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred during the server logic lookup." 
    };
  }
}