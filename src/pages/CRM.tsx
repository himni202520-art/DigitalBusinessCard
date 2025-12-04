import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { downloadVCard } from '@/lib/vcard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Phone,
  Mail,
  Linkedin,
  MessageCircle,
  Download,
  Loader2,
  ArrowLeft,
  CreditCard,
  Plus,
  Tag,
  Edit,
  Mic,
  Square,
  Send,
  FileText,
  Trash2,
  Star,
} from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Contact {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  linkedin_url?: string;
  whatsapp?: string;
  created_at: string;
  tags?: string[];
  meeting_notes?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  body_template: string;
  is_active: boolean;
}

// Predefined tag categories
const TEMPERATURE_TAGS = ['Hot', 'Warm', 'Cold'];
const RELATIONSHIP_TAGS = ['Client', 'Prospect', 'Vendor', 'Partner', 'Investor'];
const SOURCE_TAGS = ['QR Scan', 'Referral', 'Website', 'Social Media'];
const STATUS_TAGS = ['New', 'In Discussion', 'Follow-up', 'Closed Won', 'Closed Lost', 'Not Interested'];

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [eventTagEnabled, setEventTagEnabled] = useState(false);
  const [eventName, setEventName] = useState('');
  const [bulkSelectedContacts, setBulkSelectedContacts] = useState<Set<string>>(new Set());
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkCustomTag, setBulkCustomTag] = useState('');
  const [bulkEventEnabled, setBulkEventEnabled] = useState(false);
  const [bulkEventName, setBulkEventName] = useState('');
  
  // Filters
  const [activeTagFilter, setActiveTagFilter] = useState<string>('All');
  const [activeDateFilter, setActiveDateFilter] = useState<string>('all');

  // Recording states
  const [recordingContact, setRecordingContact] = useState<Contact | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingMoM, setIsProcessingMoM] = useState(false);
  const [momModalOpen, setMomModalOpen] = useState(false);
  const [momText, setMomText] = useState('');
  const [momContactId, setMomContactId] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  // Template states
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Load contacts
  useEffect(() => {
    if (!user) return;

    const loadContacts = async () => {
      setIsLoading(true);
      console.log('Loading contacts for user:', user.id);
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        toast({
          title: 'Load Failed',
          description: 'Failed to load contacts.',
          variant: 'destructive',
        });
      } else {
        console.log('Contacts loaded:', data?.length || 0);
        console.log('First contact tags:', data?.[0]?.tags);
        setContacts(data || []);
      }
      setIsLoading(false);
    };

    loadContacts();
  }, [user, toast]);

  // Load WhatsApp templates
  useEffect(() => {
    if (!user) return;

    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTemplates(data);
      }
    };

    loadTemplates();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...contacts];

    // Tag filter
    if (activeTagFilter !== 'All') {
      filtered = filtered.filter(contact => {
        const tags = contact.tags || [];
        if (activeTagFilter.startsWith('Event:')) {
          return tags.some(tag => tag === activeTagFilter);
        }
        return tags.includes(activeTagFilter);
      });
    }

    // Date filter
    if (activeDateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (activeDateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          filterDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(contact => {
        const createdAt = new Date(contact.created_at);
        return createdAt >= filterDate;
      });
    }

    setFilteredContacts(filtered);
  }, [contacts, activeTagFilter, activeDateFilter]);

  const getEventTags = () => {
    const eventTags = new Set<string>();
    contacts.forEach(contact => {
      const tags = contact.tags || [];
      tags.forEach(tag => {
        if (tag.startsWith('Event:')) {
          eventTags.add(tag);
        }
      });
    });
    return Array.from(eventTags);
  };

  const getAllFilterTags = () => {
    const allTags = [
      ...TEMPERATURE_TAGS,
      ...RELATIONSHIP_TAGS,
      ...SOURCE_TAGS,
      ...STATUS_TAGS,          // ✅ include status tags in filter
      ...getEventTags(),       // ✅ event tags from contacts
    ];
    return allTags;
  };

  const handleCall = (mobile?: string) => {
    if (!mobile) return;
    window.location.href = `tel:${mobile}`;
  };

  const handleEmail = (email?: string) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsApp = async (contact: Contact) => {
    if (!contact.whatsapp) return;

    const cleanNumber = contact.whatsapp.replace(/[^0-9]/g, '');
    
    // Get active template
    const activeTemplate = templates.find(t => t.is_active);
    let message = '';

    if (activeTemplate) {
      // Replace placeholders
      message = activeTemplate.body_template
        .replace(/\{\{name\}\}/g, contact.name || '')
        .replace(/\{\{company\}\}/g, contact.email?.split('@')[1] || '')
        .replace(/\{\{my_name\}\}/g, user?.username || '');
    } else {
      // Default message
      message = `Hi ${contact.name}, this is ${user?.username}. Saving your contact from my digital business card.`;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleLinkedIn = (linkedin?: string) => {
    if (!linkedin) return;
    window.open(linkedin, '_blank');
  };

  const handleSaveContact = (contact: Contact) => {
    downloadVCard({
      name: contact.name,
      email: contact.email,
      mobile: contact.mobile,
      linkedin: contact.linkedin_url,
      whatsapp: contact.whatsapp,
    });
    toast({
      title: 'Contact Saved',
      description: `${contact.name}'s vCard has been downloaded.`,
    });
  };

  const openEditTags = (contact: Contact) => {
    setEditingContact(contact);
    setSelectedTags(contact.tags || []);
    setCustomTag('');
    
    const existingEventTag = (contact.tags || []).find(tag => tag.startsWith('Event:'));
    if (existingEventTag) {
      setEventTagEnabled(true);
      setEventName(existingEventTag.replace('Event: ', ''));
    } else {
      setEventTagEnabled(false);
      setEventName('');
    }
    
    setTagModalOpen(true);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveTags = async () => {
    if (!editingContact || !user) return;

    let finalTags = [...selectedTags];

    if (customTag.trim()) {
      finalTags.push(customTag.trim());
    }

    // Always ensure at most one Event: tag
    finalTags = finalTags.filter(tag => !tag.startsWith('Event:'));
    if (eventTagEnabled && eventName.trim()) {
      finalTags.push(`Event: ${eventName.trim()}`);
    }

    console.log('Saving tags for contact:', editingContact.id);
    console.log('Final tags to save:', finalTags);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ 
          tags: finalTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingContact.id)
        .eq('owner_user_id', user.id);

      if (error) {
        console.error('Supabase error saving tags:', error);
        throw error;
      }

      // ✅ Update local state directly so UI reflects immediately
      setContacts(prev =>
        prev.map(c =>
          c.id === editingContact.id
            ? { ...c, tags: finalTags }
            : c
        )
      );

      toast({
        title: 'Tags Saved',
        description: `Tags have been saved: ${finalTags.join(', ')}`,
      });

      setTagModalOpen(false);
      setEditingContact(null);
      setSelectedTags([]);
      setCustomTag('');
      setEventTagEnabled(false);
      setEventName('');
    } catch (error: any) {
      console.error('Error saving tags:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openBulkEdit = () => {
    const allIds = new Set(filteredContacts.map(c => c.id));
    setBulkSelectedContacts(allIds);
    setBulkTags([]);
    setBulkCustomTag('');
    setBulkEventEnabled(false);
    setBulkEventName('');
    setBulkEditModalOpen(true);
  };

  const toggleBulkContact = (contactId: string) => {
    const newSet = new Set(bulkSelectedContacts);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setBulkSelectedContacts(newSet);
  };

  const toggleBulkTag = (tag: string) => {
    if (bulkTags.includes(tag)) {
      setBulkTags(bulkTags.filter(t => t !== tag));
    } else {
      setBulkTags([...bulkTags, tag]);
    }
  };

  const handleBulkApply = async () => {
    if (bulkSelectedContacts.size === 0) {
      toast({
        title: 'No Contacts Selected',
        description: 'Please select at least one contact.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    let tagsToAdd = [...bulkTags];

    if (bulkCustomTag.trim()) {
      tagsToAdd.push(bulkCustomTag.trim());
    }

    if (bulkEventEnabled && bulkEventName.trim()) {
      tagsToAdd.push(`Event: ${bulkEventName.trim()}`);
    }

    if (tagsToAdd.length === 0) {
      toast({
        title: 'No Tags Selected',
        description: 'Please select at least one tag to add.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Bulk updating tags for', bulkSelectedContacts.size, 'contacts');
    console.log('Tags to add:', tagsToAdd);

    try {
      // Build all updates with merged tags
      const updates = Array.from(bulkSelectedContacts).map(async (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return { success: false, id: contactId };

        const existingTags = contact.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));

        console.log(`Updating contact ${contactId} with tags:`, mergedTags);

        const { data, error } = await supabase
          .from('contacts')
          .update({ 
            tags: mergedTags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId)
          .eq('owner_user_id', user.id)
          .select(); // no .single()

        if (error) {
          console.error(`Failed to update contact ${contactId}:`, error);
          return { success: false, id: contactId };
        }
        const updatedContact = data && data[0];
        console.log(`Successfully updated contact ${contactId}:`, updatedContact);
        return { success: true, id: contactId };
      });

      const results = await Promise.all(updates);
      const successCount = results.filter(r => r?.success).length;
      const failCount = results.filter(r => r && !r.success).length;

      // Reload all contacts from database to ensure sync
      console.log('Reloading all contacts from database...');
      const { data, error: reloadError } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (reloadError) {
        console.error('Error reloading contacts:', reloadError);
      } else if (data) {
        console.log('Contacts reloaded successfully:', data.length);
        setContacts(data);
      }

      if (failCount > 0) {
        toast({
          title: 'Partial Update',
          description: `Updated ${successCount} contact(s). Failed to update ${failCount} contact(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bulk Update Complete',
          description: `Successfully updated tags for ${successCount} contact(s).`,
        });
      }

      setBulkEditModalOpen(false);
      setBulkSelectedContacts(new Set());
      setBulkTags([]);
      setBulkCustomTag('');
      setBulkEventEnabled(false);
      setBulkEventName('');
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast({
        title: 'Bulk Update Failed',
        description: error.message || 'Failed to update tags. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Meeting Recording Functions
  const startRecording = async (contact: Contact) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptRef.current = '';

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('Speech recognition started');
        };

        recognition.onresult = (event: any) => {
          console.log('Speech recognition result:', event);
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            console.log('Final transcript so far:', transcriptRef.current);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            console.log('No speech detected, continuing...');
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          // Restart if still recording
          if (isRecording && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.log('Recognition restart failed:', e);
            }
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
        }
      } else {
        console.warn('Speech recognition not supported');
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk captured:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Media recorder stopped');
      };

      // Request data every second to ensure capture
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingContact(contact);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('Recording started for contact:', contact.name);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Failed',
        description: error.message || 'Failed to access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !recordingContact) return;

    console.log('Stopping recording...');
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    // Stop media recorder
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

    // Wait for final chunks and recognition results
    await new Promise(resolve => setTimeout(resolve, 1000));

    const transcript = transcriptRef.current.trim();
    console.log('Final transcript:', transcript);
    console.log('Audio chunks collected:', audioChunksRef.current.length);

    if (!transcript) {
      // Try to use a default message if no speech detected
      const defaultTranscript = `Meeting with ${recordingContact.name}. Discussion notes not captured via speech recognition. Please add notes manually.`;
      
      toast({
        title: 'Limited Transcription',
        description: 'Speech recognition had limited results. You can add notes manually in the MoM editor.',
      });
      
      generateMoM(defaultTranscript, recordingContact);
      return;
    }

    generateMoM(transcript, recordingContact);
  };

  const generateMoM = async (transcript: string, contact: Contact) => {
    setIsProcessingMoM(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-mom', {
        body: {
          transcript,
          contactName: contact.name,
          contactCompany: contact.email?.split('@')[1] || '',
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.mom_text) {
        setMomText(data.mom_text);
        setMomContactId(contact.id);
        setMomModalOpen(true);
      }
    } catch (error: any) {
      console.error('MoM generation error:', error);
      toast({
        title: 'MoM Generation Failed',
        description: error.message || 'Failed to generate Minutes of Meeting.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingMoM(false);
      setRecordingContact(null);
    }
  };

  const saveMoMToCRM = async () => {
    if (!momContactId || !momText) return;

    const { error } = await supabase
      .from('contacts')
      .update({ 
        meeting_notes: momText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', momContactId);

    if (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save meeting notes.',
        variant: 'destructive',
      });
      return;
    }

    setContacts(contacts.map(c => 
      c.id === momContactId ? { ...c, meeting_notes: momText } : c
    ));

    toast({
      title: 'Meeting Notes Saved',
      description: 'Meeting notes have been saved to CRM.',
    });
  };

  const shareMoMViaWhatsApp = () => {
    const contact = contacts.find(c => c.id === momContactId);
    if (!contact?.whatsapp) {
      toast({
        title: 'No WhatsApp Number',
        description: 'This contact does not have a WhatsApp number.',
        variant: 'destructive',
      });
      return;
    }

    const cleanNumber = contact.whatsapp.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(momText);
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank');
  };

  const shareMoMViaEmail = () => {
    const contact = contacts.find(c => c.id === momContactId);
    if (!contact?.email) {
      toast({
        title: 'No Email Address',
        description: 'This contact does not have an email address.',
        variant: 'destructive',
      });
      return;
    }

    const subject = encodeURIComponent('Minutes of Meeting');
    const body = encodeURIComponent(momText);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  const shareMoMViaBoth = () => {
    shareMoMViaWhatsApp();
    shareMoMViaEmail();
  };

  // Template Management
  const openTemplateManager = () => {
    setTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in template name and body.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: newTemplateName,
            body_template: newTemplateBody,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        setTemplates(templates.map(t => 
          t.id === editingTemplate.id 
            ? { ...t, name: newTemplateName, body_template: newTemplateBody }
            : t
        ));

        toast({
          title: 'Template Updated',
          description: 'WhatsApp template has been updated.',
        });
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert({
            user_id: user!.id,
            name: newTemplateName,
            body_template: newTemplateBody,
            is_active: templates.length === 0, // First template is active by default
          })
          .select()
          .single();

        if (error) throw error;

        setTemplates([...templates, data]);

        toast({
          title: 'Template Created',
          description: 'WhatsApp template has been created.',
        });
      }

      setNewTemplateName('');
      setNewTemplateBody('');
      setEditingTemplate(null);
    } catch (error: any) {
      console.error('Template save error:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save template.',
        variant: 'destructive',
      });
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(templates.map(t => ({
        ...t,
        is_active: t.id === templateId,
      })));

      toast({
        title: 'Active Template Set',
        description: 'This template will be used for WhatsApp messages.',
      });
    } catch (error: any) {
      console.error('Set active template error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to set active template.',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateId));

      toast({
        title: 'Template Deleted',
        description: 'WhatsApp template has been deleted.',
      });
    } catch (error: any) {
      console.error('Delete template error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete template.',
        variant: 'destructive',
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTagColor = (tag: string) => {
    if (TEMPERATURE_TAGS.includes(tag)) {
      if (tag === 'Hot') return 'bg-red-100 text-red-700 border-red-200';
      if (tag === 'Warm') return 'bg-amber-100 text-amber-700 border-amber-200';
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (tag.startsWith('Event:')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFilterActive = activeTagFilter !== 'All' || activeDateFilter !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">CRM</h1>
                <p className="text-xs text-muted-foreground">
                  {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-card')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              My Card
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {contacts.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto gradient-bg rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">No Contacts Yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Share your business card to start collecting contacts
                  </p>
                  <Button onClick={() => navigate('/my-card')} className="gradient-bg">
                    <CreditCard className="w-4 h-4 mr-2" />
                    View My Card
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Filter Bar */}
              <Card className="p-4 mb-6 space-y-4">
                {/* Tag Filters */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-600">Filter by Tag</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openTemplateManager}
                      className="h-7 text-xs"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Templates
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={activeTagFilter === 'All' ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setActiveTagFilter('All')}
                    >
                      All
                    </Badge>
                    {getAllFilterTags().map(tag => (
                      <Badge
                        key={tag}
                        variant={activeTagFilter === tag ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setActiveTagFilter(tag)}
                      >
                        {tag.startsWith('Event:') ? tag.replace('Event: ', '') : tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Filter by Date</Label>
                  <Select value={activeDateFilter} onValueChange={setActiveDateFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="90days">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Edit Button */}
                {isFilterActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openBulkEdit}
                    className="w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Bulk Edit Tags ({filteredContacts.length} contacts)
                  </Button>
                )}
              </Card>

              {/* Contacts List */}
              <div className="w-full space-y-3">
                {filteredContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                    {/* Mobile Layout */}
                    <div className="block md:hidden p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap gap-1">
                          {(contact.tags || []).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 ${getTagColor(tag)}`}
                            >
                              {tag.startsWith('Event:') ? tag.replace('Event: ', '') : tag}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTags(contact)}
                          className="h-6 w-6 p-0 shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {contact.name}
                      </h3>
                      
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {contact.email}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {contact.mobile ? (
                          <button
                            onClick={() => handleCall(contact.mobile)}
                            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="truncate">{contact.mobile}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No phone</span>
                        )}
                        
                        {contact.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(contact)}
                            className="h-7 px-3 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        {/* Recording Button */}
                        {recordingContact?.id === contact.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={stopRecording}
                            disabled={isProcessingMoM}
                            className="h-7 px-3 text-xs border-red-500 text-red-600"
                          >
                            {isProcessingMoM ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5 mr-1" />
                                Stop & Generate MoM ({formatRecordingTime(recordingTime)})
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startRecording(contact)}
                            disabled={isRecording || isProcessingMoM}
                            className="h-7 px-3 text-xs"
                          >
                            <Mic className="w-3.5 h-3.5 mr-1" />
                            Record
                          </Button>
                        )}

                        {contact.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmail(contact.email)}
                            className="h-7 px-3 text-xs"
                          >
                            <Mail className="w-3.5 h-3.5 mr-1" />
                            Email
                          </Button>
                        )}
                        {contact.linkedin_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLinkedIn(contact.linkedin_url)}
                            className="h-7 px-3 text-xs"
                          >
                            <Linkedin className="w-3.5 h-3.5 mr-1" />
                            LinkedIn
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSaveContact(contact)}
                          className="h-7 px-3 text-xs gradient-bg ml-auto"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Save
                        </Button>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Added on {formatDateTime(contact.created_at)}
                      </p>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-[minmax(160px,2fr)_minmax(160px,2fr)_minmax(120px,1.5fr)_minmax(180px,1.5fr)] gap-3 p-5 items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {contact.name}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditTags(contact)}
                            className="h-6 w-6 p-0 shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(contact.tags || []).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 ${getTagColor(tag)}`}
                            >
                              {tag.startsWith('Event:') ? tag.replace('Event: ', '') : tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Added on {formatDateTime(contact.created_at)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 min-w-0">
                        {contact.email ? (
                          <>
                            <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <button
                              onClick={() => handleEmail(contact.email)}
                              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors truncate"
                            >
                              {contact.email}
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {contact.mobile ? (
                          <>
                            <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <button
                              onClick={() => handleCall(contact.mobile)}
                              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                            >
                              {contact.mobile}
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 justify-end">
                        {recordingContact?.id === contact.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={stopRecording}
                            disabled={isProcessingMoM}
                            className="border-red-500 text-red-600"
                          >
                            {isProcessingMoM ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 mr-1" />
                                Stop ({formatRecordingTime(recordingTime)})
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startRecording(contact)}
                            disabled={isRecording || isProcessingMoM}
                            title="Record Meeting"
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                        )}

                        {contact.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(contact)}
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {contact.linkedin_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLinkedIn(contact.linkedin_url)}
                            title="LinkedIn"
                          >
                            <Linkedin className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSaveContact(contact)}
                          className="gradient-bg"
                          title="Save Contact"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Edit Tags Modal */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tags - {editingContact?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Lead Temperature</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPERATURE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Relationship</Label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Source</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="event-tag"
                  checked={eventTagEnabled}
                  onCheckedChange={(checked) => setEventTagEnabled(checked as boolean)}
                />
              <Label htmlFor="event-tag" className="text-sm font-medium cursor-pointer">
                  Event
                </Label>
              </div>
              {eventTagEnabled && (
                <Input
                  placeholder="Enter event name..."
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="animate-slide-up"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Tag</Label>
              <Input
                placeholder="Enter custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
              />
            </div>

            <Button onClick={handleSaveTags} className="w-full gradient-bg">
              <Tag className="w-4 h-4 mr-2" />
              Save Tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={bulkEditModalOpen} onOpenChange={setBulkEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              {bulkSelectedContacts.size} contact{bulkSelectedContacts.size !== 1 ? 's' : ''} selected
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {filteredContacts.map(contact => (
                <div key={contact.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded">
                  <Checkbox
                    checked={bulkSelectedContacts.has(contact.id)}
                    onCheckedChange={() => toggleBulkContact(contact.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-slate-500 truncate">{contact.email || contact.mobile}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(contact.tags || []).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lead Temperature</Label>
                <div className="flex flex-wrap gap-2">
                  {TEMPERATURE_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Relationship</Label>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIP_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Source</Label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-event-tag"
                    checked={bulkEventEnabled}
                    onCheckedChange={(checked) => setBulkEventEnabled(checked as boolean)}
                  />
                  <Label htmlFor="bulk-event-tag" className="text-sm font-medium cursor-pointer">
                    Event
                  </Label>
                </div>
                {bulkEventEnabled && (
                  <Input
                    placeholder="Enter event name..."
                    value={bulkEventName}
                    onChange={(e) => setBulkEventName(e.target.value)}
                    className="animate-slide-up"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Tag</Label>
                <Input
                  placeholder="Enter custom tag..."
                  value={bulkCustomTag}
                  onChange={(e) => setBulkCustomTag(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleBulkApply} className="w-full gradient-bg">
              Apply to Selected Contacts
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Minutes of Meeting Modal */}
      <Dialog open={momModalOpen} onOpenChange={setMomModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Minutes of Meeting - {contacts.find(c => c.id === momContactId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={momText}
              onChange={(e) => setMomText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={shareMoMViaWhatsApp}
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send via WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={shareMoMViaEmail}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send via Email
              </Button>
              <Button
                variant="outline"
                onClick={shareMoMViaBoth}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send via Both
              </Button>
            </div>

            <Button
              onClick={saveMoMToCRM}
              className="w-full gradient-bg"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save to CRM
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Template Manager Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>WhatsApp Message Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Template List */}
            {templates.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Saved Templates</Label>
                {templates.map(template => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{template.name}</h4>
                          {template.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {template.body_template}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!template.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTemplate(template.id)}
                            title="Set as active"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(template);
                            setNewTemplateName(template.name);
                            setNewTemplateBody(template.body_template);
                          }}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplate(template.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* New/Edit Template Form */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm font-medium">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Event Follow-up, New Lead, Thank You"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-body">Template Text</Label>
                  <Textarea
                    id="template-body"
                    placeholder="Hi {{name}}, it was great connecting with you. This is {{my_name}} from {{company}}."
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-slate-500">
                    Use placeholders: <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{my_name}}'}</code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveTemplate}
                    className="flex-1 gradient-bg"
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                  {editingTemplate && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(null);
                        setNewTemplateName('');
                        setNewTemplateBody('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
                   }
