import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { transcript, contactName, contactCompany } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating Minutes of Meeting for contact:', contactName);

    // Prepare context
    const contextParts = [];
    if (contactName) contextParts.push(`Contact: ${contactName}`);
    if (contactCompany) contextParts.push(`Company: ${contactCompany}`);
    contextParts.push(`Meeting Transcript:\n${transcript}`);

    const context = contextParts.join('\n');

    const prompt = `You are a professional meeting assistant. From the meeting transcript below, create concise Minutes of Meeting (MoM).

${context}

Generate a professional MoM with:
- Brief context (participants, date/time if mentioned)
- Key discussion points (3-5 bullet points)
- Decisions taken (if any)
- Action items with responsible person (if any)

Use clear bullet points. Limit to 8-12 lines total. Be specific and actionable.

Generate the Minutes of Meeting now:`;

    // Call OnSpace AI
    const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');

    if (!aiBaseUrl || !aiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling OnSpace AI...');
    const aiResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const momText = aiData.choices?.[0]?.message?.content?.trim();

    if (!momText) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate Minutes of Meeting' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('MoM generated successfully');

    return new Response(
      JSON.stringify({ 
        mom_text: momText,
        transcript: transcript 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-mom:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
