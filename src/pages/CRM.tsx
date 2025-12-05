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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ArrowLeft,
  Search,
  Filter,
  Phone,
  Mail,
  Linkedin,
  MessageCircle,
  Download,
  Loader2,
  User,
  Mic,
  Square,
  Send,
  FileText,
  Trash2,
  Star,
  Edit,
  Tag,
  MoreVertical,
  Plus,
  X,
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

const TEMPERATURE_TAGS = ['Hot', 'Warm', 'Cold'];
const RELATIONSHIP_TAGS = ['Client', 'Prospect', 'Vendor', 'Partner', 'Investor'];
const SOURCE_TAGS = ['QR Scan', 'Referral', 'Website', 'Social Media'];
const STATUS_TAGS = [
  'New',
  'In Discussion',
  'Follow-up',
  'Closed Won',
  'Closed Lost',
  'Not Interested',
];
const PRIMARY_TAGS = ['All', 'Hot', 'Warm', 'Cold', 'Client', 'Vendor', 'Follow-up'];

const DATE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
];

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [eventTagEnabled, setEventTagEnabled] = useState(false);
  const [eventName, setEventName] = useState('');
  const [bulkSelectedContacts, setBulkSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkCustomTag, setBulkCustomTag] = useState('');
  const [bulkEventEnabled, setBulkEventEnabled] = useState(false);
  const [bulkEventName, setBulkEventName] = useState('');

  const [activeTagFilter, setActiveTagFilter] = useState<string>('All');
  const [activeDateFilter, setActiveDateFilter] = useState<string>('all');
  const [tempTagFilter, setTempTagFilter] = useState<string>('All');
  const [tempDateFilter, setTempDateFilter] = useState<string>('all');

  // Dynamic tag categories (customisable)
  const [temperatureTags, setTemperatureTags] = useState<string[]>(TEMPERATURE_TAGS);
  const [relationshipTags, setRelationshipTags] = useState<string[]>(RELATIONSHIP_TAGS);
  const [sourceTags, setSourceTags] = useState<string[]>(SOURCE_TAGS);
  const [statusTags, setStatusTags] = useState<string[]>(STATUS_TAGS);

  const [newTemperatureTag, setNewTemperatureTag] = useState('');
  const [newRelationshipTag, setNewRelationshipTag] = useState('');
  const [newSourceTag, setNewSourceTag] = useState('');
  const [newStatusTag, setNewStatusTag] = useState('');

  // Quick filter bar customisation
  const [primaryQuickTags, setPrimaryQuickTags] =
    useState<string[]>(PRIMARY_TAGS);
  const [quickTagModalOpen, setQuickTagModalOpen] = useState(false);
  const [quickTagSelection, setQuickTagSelection] = useState<Set<string>>(
    () => new Set(PRIMARY_TAGS.filter((t) => t !== 'All'))
  );

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(20);

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

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(
    null
  );
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');

  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const loadContacts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setContacts(data);
      }
      setIsLoading(false);
    };

    loadContacts();
  }, [user]);

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

  // Apply search + tag + date filters
  useEffect(() => {
    let filtered = [...contacts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.mobile?.toLowerCase().includes(query) ||
        contact.whatsapp?.toLowerCase().includes(query)
      );
    }

    if (activeTagFilter !== 'All') {
      filtered = filtered.filter((contact) => {
        const tags = contact.tags || [];
        if (activeTagFilter.startsWith('Event:')) {
          return tags.some((tag) => tag === activeTagFilter);
        }
        return tags.includes(activeTagFilter);
      });
    }

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

      filtered = filtered.filter((contact) => {
        const createdAt = new Date(contact.created_at);
        return createdAt >= filterDate;
      });
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, activeTagFilter, activeDateFilter]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [filteredContacts.length]);

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 200
      ) {
        setVisibleCount((prev) =>
          prev >= filteredContacts.length ? prev : prev + 20
        );
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredContacts.length]);

  // Sync quick tag selection when opening modal
  useEffect(() => {
    if (quickTagModalOpen) {
      setQuickTagSelection(new Set(primaryQuickTags.filter((t) => t !== 'All')));
    }
  }, [quickTagModalOpen, primaryQuickTags]);

  const getStatusColor = (tags: string[]) => {
    if (tags.includes('Hot')) return 'border-l-red-500';
    if (tags.includes('Warm')) return 'border-l-orange-500';
    if (tags.includes('Cold')) return 'border-l-blue-500';
    if (tags.includes('Client')) return 'border-l-green-500';
    return 'border-l-slate-300';
  };

  const getTagColor = (tag: string) => {
    if (tag === 'Hot') return 'bg-red-50 text-red-700 border-red-200';
    if (tag === 'Warm') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (tag === 'Cold') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (tag === 'Client') return 'bg-green-50 text-green-700 border-green-200';
    if (tag.startsWith('Event:')) return 'bg-violet-50 text-violet-700 border-violet-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    const activeTemplate = templates.find((t) => t.is_active);
    let message = '';

    if (activeTemplate) {
      message = activeTemplate.body_template
        .replace(/\{\{name\}\}/g, contact.name || '')
        .replace(/\{\{company\}\}/g, contact.email?.split('@')[1] || '')
        .replace(/\{\{my_name\}\}/g, user?.username || '');
    } else {
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

    const existingEventTag = (contact.tags || []).find((tag) =>
      tag.startsWith('Event:')
    );
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
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Add new tags to categories
  const handleAddTemperatureTag = () => {
    const value = newTemperatureTag.trim();
    if (!value) return;
    if (temperatureTags.includes(value)) {
      setNewTemperatureTag('');
      return;
    }
    setTemperatureTags([...temperatureTags, value]);
    setNewTemperatureTag('');
  };

  const handleAddRelationshipTag = () => {
    const value = newRelationshipTag.trim();
    if (!value) return;
    if (relationshipTags.includes(value)) {
      setNewRelationshipTag('');
      return;
    }
    setRelationshipTags([...relationshipTags, value]);
    setNewRelationshipTag('');
  };

  const handleAddSourceTag = () => {
    const value = newSourceTag.trim();
    if (!value) return;
    if (sourceTags.includes(value)) {
      setNewSourceTag('');
      return;
    }
    setSourceTags([...sourceTags, value]);
    setNewSourceTag('');
  };

  const handleAddStatusTag = () => {
    const value = newStatusTag.trim();
    if (!value) return;
    if (statusTags.includes(value)) {
      setNewStatusTag('');
      return;
    }
    setStatusTags([...statusTags, value]);
    setNewStatusTag('');
  };

  // Delete a tag from a category (not the group)
  const handleDeleteCategoryTag = (
    category: 'temperature' | 'relationship' | 'source' | 'status',
    tag: string
  ) => {
    if (category === 'temperature') {
      setTemperatureTags((prev) => prev.filter((t) => t !== tag));
    } else if (category === 'relationship') {
      setRelationshipTags((prev) => prev.filter((t) => t !== tag));
    } else if (category === 'source') {
      setSourceTags((prev) => prev.filter((t) => t !== tag));
    } else if (category === 'status') {
      setStatusTags((prev) => prev.filter((t) => t !== tag));
    }

    // Remove from currently selected tags / bulk / quick filters / active filter
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
    setBulkTags((prev) => prev.filter((t) => t !== tag));
    setPrimaryQuickTags((prev) =>
      prev.filter((t) => t === 'All' || t !== tag)
    );
    if (activeTagFilter === tag) setActiveTagFilter('All');
    if (tempTagFilter === tag) setTempTagFilter('All');
  };

  const handleSaveTags = async () => {
    if (!editingContact || !user) return;

    let finalTags = [...selectedTags];

    if (customTag.trim()) {
      finalTags.push(customTag.trim());
    }

    // Remove old event tags
    finalTags = finalTags.filter((tag) => !tag.startsWith('Event:'));
    if (eventTagEnabled && eventName.trim()) {
      finalTags.push(`Event: ${eventName.trim()}`);
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          tags: finalTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingContact.id)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContact.id ? { ...c, tags: finalTags } : c
        )
      );

      toast({
        title: 'Tags Updated',
        description: 'Contact tags have been saved successfully.',
      });

      setTagModalOpen(false);
      setEditingContact(null);
      setSelectedTags([]);
      setCustomTag('');
      setEventTagEnabled(false);
      setEventName('');
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to save tags.',
        variant: 'destructive',
      });
    }
  };

  const openBulkEdit = () => {
    const allIds = new Set(filteredContacts.map((c) => c.id));
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
      setBulkTags(bulkTags.filter((t) => t !== tag));
    } else {
      setBulkTags([...bulkTags, tag]);
    }
  };

  const handleBulkApply = async () => {
    if (bulkSelectedContacts.size === 0 || !user) return;

    let tagsToAdd = [...bulkTags];
    if (bulkCustomTag.trim()) tagsToAdd.push(bulkCustomTag.trim());
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

    try {
      const updates = Array.from(bulkSelectedContacts).map(async (contactId) => {
        const contact = contacts.find((c) => c.id === contactId);
        if (!contact) return { success: false, id: contactId };

        const existingTags = contact.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));

        const { error } = await supabase
          .from('contacts')
          .update({
            tags: mergedTags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId)
          .eq('owner_user_id', user.id);

        return { success: !error, id: contactId };
      });

      const results = await Promise.all(updates);
      const successCount = results.filter((r) => r?.success).length;

      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setContacts(data);

      toast({
        title: 'Bulk Update Complete',
        description: `Successfully updated ${successCount} contact(s).`,
      });

      setBulkEditModalOpen(false);
      setBulkSelectedContacts(new Set());
      setBulkTags([]);
      setBulkCustomTag('');
      setBulkEventEnabled(false);
      setBulkEventName('');
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update tags.',
        variant: 'destructive',
      });
    }
  };

  const startRecording = async (contact: Contact) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptRef.current = '';

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
          }
        };

        recognition.onend = () => {
          if (isRecording && recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              console.log('Recognition restart failed');
            }
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          console.error('Failed to start recognition');
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingContact(contact);
      setRecordingTime(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      toast({
        title: 'Recording Failed',
        description: 'Failed to access microphone.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !recordingContact) return;

    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch {
        console.error('Error stopping recognition');
      }
    }

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      const defaultTranscript = `Meeting with ${recordingContact.name}. Discussion notes not captured via speech recognition. Please add notes manually.`;

      toast({
        title: 'Limited Transcription',
        description: 'You can add notes manually in the MoM editor.',
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
            errorMessage = `[Code: ${statusCode}] ${
              textContent || error.message || 'Unknown error'
            }`;
          } catch {
            errorMessage = error.message || 'Failed to read response';
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

    setContacts(
      contacts.map((c) =>
        c.id === momContactId ? { ...c, meeting_notes: momText } : c
      )
    );

    toast({
      title: 'Notes Saved',
      description: 'Meeting notes saved to CRM.',
    });
  };

  const shareMoMViaWhatsApp = () => {
    const contact = contacts.find((c) => c.id === momContactId);
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
    const contact = contacts.find((c) => c.id === momContactId);
    if (!contact?.email) {
      toast({
        title: 'No Email',
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

        setTemplates(
          templates.map((t) =>
            t.id === editingTemplate.id
              ? { ...t, name: newTemplateName, body_template: newTemplateBody }
              : t
          )
        );

        toast({
          title: 'Template Updated',
          description: 'WhatsApp template updated successfully.',
        });
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert({
            user_id: user!.id,
            name: newTemplateName,
            body_template: newTemplateBody,
            is_active: templates.length === 0,
          })
          .select()
          .single();

        if (error) throw error;

        setTemplates([...templates, data]);

        toast({
          title: 'Template Created',
          description: 'WhatsApp template created successfully.',
        });
      }

      setNewTemplateName('');
      setNewTemplateBody('');
      setEditingTemplate(null);
    } catch (error: any) {
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

      setTemplates(
        templates.map((t) => ({
          ...t,
          is_active: t.id === templateId,
        }))
      );

      toast({
        title: 'Active Template Set',
        description: 'Template will be used for WhatsApp messages.',
      });
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Failed to set active template.',
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

      setTemplates(templates.filter((t) => t.id !== templateId));

      toast({
        title: 'Template Deleted',
        description: 'WhatsApp template deleted successfully.',
      });
    } catch {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete template.',
        variant: 'destructive',
      });
    }
  };

  const applyFilters = () => {
    setActiveTagFilter(tempTagFilter);
    setActiveDateFilter(tempDateFilter);
    setFilterSheetOpen(false);
  };

  const clearFilters = () => {
    setTempTagFilter('All');
    setTempDateFilter('all');
    setActiveTagFilter('All');
    setActiveDateFilter('all');
    setFilterSheetOpen(false);
  };

  // Quick tag selection helpers
  const toggleQuickTagSelection = (tag: string) => {
    setQuickTagSelection((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applyQuickTags = () => {
    const selected = Array.from(quickTagSelection);
    setPrimaryQuickTags(['All', ...selected]);
    setQuickTagModalOpen(false);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const isFilterActive = activeTagFilter !== 'All' || activeDateFilter !== 'all';

  // Collect all tags in the system to show category-wise filters
  const allContactTags = Array.from(
    new Set(contacts.flatMap((c) => c.tags || []))
  );
  const baseCategoryTags = new Set([
    ...temperatureTags,
    ...relationshipTags,
    ...sourceTags,
    ...statusTags,
  ]);
  const eventTags = allContactTags.filter((t) => t.startsWith('Event:'));
  const otherCustomTags = allContactTags.filter(
    (t) => !baseCategoryTags.has(t) && !t.startsWith('Event:')
  );

  const allAvailableTags = Array.from(
    new Set([
      ...temperatureTags,
      ...relationshipTags,
      ...sourceTags,
      ...statusTags,
      ...eventTags,
      ...otherCustomTags,
    ])
  ).sort();

  const visibleContacts = filteredContacts.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-white">
      {/* Premium App Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 backdrop-blur-xl bg-white/80">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/my-card')}
                className="rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold synka-gradient-text">
                  SYNKA CRM
                </h1>
                <p className="text-xs text-slate-500">
                  {filteredContacts.length} contact
                  {filteredContacts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/my-card')}
              className="rounded-full hover:bg-slate-100"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Search + Filter Bar */}
      <div className="sticky top-[73px] z-40 bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-300"
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10 relative"
              >
                <Filter className="w-4 h-4" />
                {isFilterActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-600 rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)]">
                {/* DATE FIRST - chip style for better mobile fit */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Date Range</Label>
                  <div className="flex flex-wrap gap-2">
                    {DATE_FILTER_OPTIONS.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={
                          tempDateFilter === opt.value ? 'default' : 'outline'
                        }
                        className={`cursor-pointer px-3 py-1.5 rounded-full ${
                          tempDateFilter === opt.value
                            ? 'synka-gradient text-white border-0'
                            : ''
                        }`}
                        onClick={() => setTempDateFilter(opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* TAGS BY CATEGORY BELOW DATE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Tag Filters</Label>
                    <button
                      type="button"
                      className="text-xs text-slate-500 underline"
                      onClick={() => setTempTagFilter('All')}
                    >
                      Clear tag filter
                    </button>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Temperature
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {temperatureTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tempTagFilter === tag ? 'default' : 'outline'
                          }
                          className={`cursor-pointer px-3 py-1.5 rounded-full ${
                            tempTagFilter === tag
                              ? 'synka-gradient text-white border-0'
                              : ''
                          }`}
                          onClick={() => setTempTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Relationship
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relationshipTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tempTagFilter === tag ? 'default' : 'outline'
                          }
                          className={`cursor-pointer px-3 py-1.5 rounded-full ${
                            tempTagFilter === tag
                              ? 'synka-gradient text-white border-0'
                              : ''
                          }`}
                          onClick={() => setTempTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Source */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Source
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sourceTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tempTagFilter === tag ? 'default' : 'outline'
                          }
                          className={`cursor-pointer px-3 py-1.5 rounded-full ${
                            tempTagFilter === tag
                              ? 'synka-gradient text-white border-0'
                              : ''
                          }`}
                          onClick={() => setTempTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Event tags (dynamic) */}
                  {eventTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        Events
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {eventTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={
                              tempTagFilter === tag ? 'default' : 'outline'
                            }
                            className={`cursor-pointer px-3 py-1.5 rounded-full ${
                              tempTagFilter === tag
                                ? 'synka-gradient text-white border-0'
                                : ''
                            }`}
                            onClick={() => setTempTagFilter(tag)}
                          >
                            {tag.replace('Event: ', '')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {statusTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tempTagFilter === tag ? 'default' : 'outline'
                          }
                          className={`cursor-pointer px-3 py-1.5 rounded-full ${
                            tempTagFilter === tag
                              ? 'synka-gradient text-white border-0'
                              : ''
                          }`}
                          onClick={() => setTempTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Custom / Other */}
                  {otherCustomTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        Other Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherCustomTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={
                              tempTagFilter === tag ? 'default' : 'outline'
                            }
                            className={`cursor-pointer px-3 py-1.5 rounded-full ${
                              tempTagFilter === tag
                                ? 'synka-gradient text-white border-0'
                                : ''
                            }`}
                            onClick={() => setTempTagFilter(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex gap-3">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1 rounded-xl"
                >
                  Clear All
                </Button>
                <Button
                  onClick={applyFilters}
                  className="flex-1 rounded-xl synka-gradient ripple-effect"
                >
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Primary quick tags + customisation */}
      <div className="sticky top-[137px] z-30 bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {primaryQuickTags.map((tag) => (
            <Badge
              key={tag}
              variant={activeTagFilter === tag ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0 ${
                activeTagFilter === tag
                  ? 'synka-gradient text-white border-0'
                  : 'border-slate-200'
              }`}
              onClick={() => setActiveTagFilter(tag)}
            >
              {tag}
            </Badge>
          ))}

          {/* Add / edit quick filters */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full h-8 w-8 shrink-0"
            onClick={() => setQuickTagModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Edit Button */}
      {isFilterActive && filteredContacts.length > 0 && (
        <div className="px-4 py-3 bg-violet-50/50">
          <div className="max-w-7xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={openBulkEdit}
              className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Bulk Edit ({filteredContacts.length})
            </Button>
          </div>
        </div>
      )}

      {/* Main Content with infinite scroll */}
      <main className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {contacts.length === 0 ? (
            <Card className="p-12 rounded-3xl premium-shadow text-center">
              <div className="w-20 h-20 mx-auto mb-4 synka-gradient rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Contacts Yet</h2>
              <p className="text-slate-600 mb-6">
                Share your business card to start collecting contacts
              </p>
              <Button
                onClick={() => navigate('/my-card')}
                className="synka-gradient ripple-effect"
              >
                View My Card
              </Button>
            </Card>
          ) : visibleContacts.length === 0 ? (
            <Card className="p-12 rounded-3xl premium-shadow text-center">
              <p className="text-slate-600">No contacts match your filters</p>
            </Card>
          ) : (
            <div className="space-y-3 animate-slide-in">
              {visibleContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className={`p-4 rounded-2xl border-l-4 premium-shadow premium-shadow-hover transition-all ${getStatusColor(
                    contact.tags || []
                  )}`}
                >
                  {/* Top Row: name + tags + date + menu */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-1 truncate">
                        {contact.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(contact.tags || []).slice(0, 3).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={`text-[10px] px-2 py-[3px] rounded-full ${getTagColor(
                              tag
                            )}`}
                          >
                            {tag.startsWith('Event:')
                              ? tag.replace('Event: ', '')
                              : tag}
                          </Badge>
                        ))}
                        {(contact.tags || []).length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-[3px] rounded-full bg-slate-50"
                          >
                            +{(contact.tags || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTags(contact)}
                        className="rounded-full h-8 w-8"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(contact.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Info + icon actions */}
                  <div className="space-y-1.5">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-[12px] text-slate-600">
                        <Mail className="w-4 h-4 shrink-0 text-slate-400" />
                        <button
                          onClick={() => handleEmail(contact.email)}
                          className="truncate hover:text-violet-600 transition-colors text-left"
                        >
                          {contact.email}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 text-[12px] text-slate-600 mt-1">
                      {contact.mobile ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0 text-slate-400" />
                          <button
                            onClick={() => handleCall(contact.mobile!)}
                            className="hover:text-violet-600 transition-colors"
                          >
                            {contact.mobile}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-400">
                          No phone
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {/* Record */}
                        {recordingContact?.id === contact.id ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600 text-xs shadow-sm active:scale-95 transition"
                            aria-label="Stop recording"
                            disabled={isProcessingMoM}
                          >
                            {isProcessingMoM ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRecording(contact)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 text-xs shadow-sm active:scale-95 transition"
                            aria-label="Record meeting"
                            disabled={isRecording || isProcessingMoM}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* WhatsApp */}
                        {contact.whatsapp && (
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(contact)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-[#25D366] bg-[#E9F9EE] text-[#25D366] shadow-[0_2px_6px_rgba(37,211,102,0.4)] active:scale-95 transition"
                            aria-label="WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* LinkedIn */}
                        {contact.linkedin_url && (
                          <IconCircleButton
                            onClick={() => handleLinkedIn(contact.linkedin_url!)}
                            ariaLabel="Open LinkedIn"
                          >
                            <Linkedin className="w-[15px] h-[15px]" />
                          </IconCircleButton>
                        )}

                        {/* Save */}
                        <IconCircleButton
                          onClick={() => handleSaveContact(contact)}
                          ariaLabel="Download vCard"
                          primary
                        >
                          <Download className="w-[15px] h-[15px]" />
                        </IconCircleButton>
                      </div>
                    </div>
                  </div>

                  {/* Recording timer */}
                  {recordingContact?.id === contact.id && (
                    <div className="mt-2 text-[11px] text-red-500 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording... {formatRecordingTime(recordingTime)}
                    </div>
                  )}
                </Card>
              ))}

              {visibleCount < filteredContacts.length && (
                <div className="py-4 text-center text-xs text-slate-400">
                  Scroll to load more...
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Edit Tags Modal with per-header customisation */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Temperature */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Temperature</Label>
              <div className="flex flex-wrap gap-2">
                {temperatureTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1 ${
                      selectedTags.includes(tag)
                        ? 'synka-gradient text-white border-0'
                        : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryTag('temperature', tag);
                      }}
                      className="rounded-full p-[2px] hover:bg-black/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add temperature tag..."
                  value={newTemperatureTag}
                  onChange={(e) => setNewTemperatureTag(e.target.value)}
                  className="rounded-full h-8 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={handleAddTemperatureTag}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Relationship */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Relationship</Label>
              <div className="flex flex-wrap gap-2">
                {relationshipTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1 ${
                      selectedTags.includes(tag)
                        ? 'synka-gradient text-white border-0'
                        : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryTag('relationship', tag);
                      }}
                      className="rounded-full p-[2px] hover:bg-black/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add relationship tag..."
                  value={newRelationshipTag}
                  onChange={(e) => setNewRelationshipTag(e.target.value)}
                  className="rounded-full h-8 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={handleAddRelationshipTag}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Source */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Source</Label>
              <div className="flex flex-wrap gap-2">
                {sourceTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1 ${
                      selectedTags.includes(tag)
                        ? 'synka-gradient text-white border-0'
                        : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryTag('source', tag);
                      }}
                      className="rounded-full p-[2px] hover:bg-black/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add source tag..."
                  value={newSourceTag}
                  onChange={(e) => setNewSourceTag(e.target.value)}
                  className="rounded-full h-8 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={handleAddSourceTag}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Event just below Source */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="event-tag"
                  checked={eventTagEnabled}
                  onCheckedChange={(checked) =>
                    setEventTagEnabled(checked as boolean)
                  }
                />
                <Label
                  htmlFor="event-tag"
                  className="text-sm font-semibold cursor-pointer"
                >
                  Event
                </Label>
              </div>
              {eventTagEnabled && (
                <Input
                  placeholder="Enter event name (e.g. Diwali Expo)..."
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="rounded-xl"
                />
              )}
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1 ${
                      selectedTags.includes(tag)
                        ? 'synka-gradient text-white border-0'
                        : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryTag('status', tag);
                      }}
                      className="rounded-full p-[2px] hover:bg-black/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add status tag..."
                  value={newStatusTag}
                  onChange={(e) => setNewStatusTag(e.target.value)}
                  className="rounded-full h-8 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={handleAddStatusTag}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Custom Tag (for anything extra like "Happy", "Bharat" etc.) */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Custom Tag</Label>
              <Input
                placeholder="Enter custom tag (e.g. Bharat, Happy)..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={handleSaveTags}
              className="w-full rounded-xl synka-gradient ripple-effect"
            >
              <Tag className="w-4 h-4 mr-2" />
              Save Tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={bulkEditModalOpen} onOpenChange={setBulkEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              {bulkSelectedContacts.size} contact
              {bulkSelectedContacts.size !== 1 ? 's' : ''} selected
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-2xl p-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl"
                >
                  <Checkbox
                    checked={bulkSelectedContacts.has(contact.id)}
                    onCheckedChange={() => toggleBulkContact(contact.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {contact.email || contact.mobile}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(contact.tags || []).map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 rounded-full"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {/* Temperature */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Temperature</Label>
                <div className="flex flex-wrap gap-2">
                  {temperatureTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer px-3 py-1.5 rounded-full ${
                        bulkTags.includes(tag)
                          ? 'synka-gradient text-white border-0'
                          : ''
                      }`}
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Relationship */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Relationship</Label>
                <div className="flex flex-wrap gap-2">
                  {relationshipTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer px-3 py-1.5 rounded-full ${
                        bulkTags.includes(tag)
                          ? 'synka-gradient text-white border-0'
                          : ''
                      }`}
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Source</Label>
                <div className="flex flex-wrap gap-2">
                  {sourceTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer px-3 py-1.5 rounded-full ${
                        bulkTags.includes(tag)
                          ? 'synka-gradient text-white border-0'
                          : ''
                      }`}
                      onClick={() => toggleBulkTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Event */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-event-tag"
                    checked={bulkEventEnabled}
                    onCheckedChange={(checked) =>
                      setBulkEventEnabled(checked as boolean)
                    }
                  />
                <Label
                  htmlFor="bulk-event-tag"
                  className="text-sm font-semibold cursor-pointer"
                >
                  Event
                </Label>
              </div>
              {bulkEventEnabled && (
                <Input
                  placeholder="Enter event name..."
                  value={bulkEventName}
                  onChange={(e) => setBulkEventName(e.target.value)}
                  className="rounded-xl animate-slide-up"
                />
              )}
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={bulkTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer px-3 py-1.5 rounded-full ${
                      bulkTags.includes(tag)
                        ? 'synka-gradient text-white border-0'
                        : ''
                    }`}
                    onClick={() => toggleBulkTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Custom Tag</Label>
              <Input
                placeholder="Enter custom tag..."
                value={bulkCustomTag}
                onChange={(e) => setBulkCustomTag(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <Button
            onClick={handleBulkApply}
            className="w-full rounded-xl synka-gradient ripple-effect"
          >
            Apply to Selected Contacts
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* MoM Modal */}
    <Dialog open={momModalOpen} onOpenChange={setMomModalOpen}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            Minutes of Meeting -{' '}
            {contacts.find((c) => c.id === momContactId)?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={momText}
            onChange={(e) => setMomText(e.target.value)}
            rows={12}
            className="font-mono text-sm rounded-xl"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={shareMoMViaWhatsApp}
              className="rounded-xl"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={shareMoMViaEmail}
              className="rounded-xl"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant="outline"
              onClick={shareMoMViaBoth}
              className="rounded-xl"
            >
              <Send className="w-4 h-4 mr-2" />
              Both
            </Button>
          </div>

          <Button
            onClick={saveMoMToCRM}
            className="w-full rounded-xl synka-gradient ripple-effect"
          >
            <FileText className="w-4 h-4 mr-2" />
            Save to CRM
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Template Manager Modal */}
    <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>WhatsApp Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {templates.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Saved Templates</Label>
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 rounded-2xl premium-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">
                          {template.name}
                        </h4>
                        {template.is_active && (
                          <Badge className="text-xs synka-gradient border-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {template.body_template}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!template.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTemplate(template.id)}
                          className="rounded-xl"
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
                        className="rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-semibold">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </Label>
            <div className="space-y-3">
              <Input
                placeholder="Template name..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="rounded-xl"
              />
              <Textarea
                placeholder="Hi {{name}}, it was great connecting with you..."
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                rows={4}
                className="rounded-xl"
              />
              <p className="text-xs text-slate-500">
                Use: <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>,{' '}
                <code>{'{{my_name}}'}</code>
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={saveTemplate}
                  className="flex-1 rounded-xl synka-gradient ripple-effect"
                >
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
                {editingTemplate && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(null);
                      setNewTemplateName('');
                      setNewTemplateBody('');
                    }}
                    className="rounded-xl"
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

    {/* Quick Filter Tag Manager Modal */}
    <Dialog open={quickTagModalOpen} onOpenChange={setQuickTagModalOpen}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Quick Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Choose which tags should appear in the quick filter bar under search.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Available Tags</p>
            <div className="flex flex-wrap gap-2">
              {allAvailableTags.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No tags available yet. Add tags to contacts first.
                </p>
              ) : (
                allAvailableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleQuickTagSelection(tag)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs border',
                      quickTagSelection.has(tag)
                        ? 'synka-gradient text-white border-0'
                        : 'border-slate-200 text-slate-700 bg-white',
                    ].join(' ')}
                  >
                    {tag.startsWith('Event:') ? tag.replace('Event: ', '') : tag}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setQuickTagSelection(new Set())}
            >
              Clear
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-xl synka-gradient ripple-effect"
              onClick={applyQuickTags}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
  );
}

/** small circular icon button for LinkedIn / Save */
function IconCircleButton({
  children,
  onClick,
  ariaLabel,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-all shadow-sm',
        primary
          ? 'border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:shadow-md active:scale-95'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** WhatsApp-style icon using currentColor */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 4c-6.1 0-11 4.6-11 10.4 0 2 .6 3.9 1.7 5.6L6 27l7.1-2.2c1 0.3 2.1 0.4 3.2 0.4 6.1 0 11-4.6 11-10.4S22.1 4 16 4z"
        fill="currentColor"
        fillOpacity="0.95"
      />
      <circle cx="16" cy="15" r="7.8" fill="white" />
      <path
        d="M19.6 18.9c-.3-.2-1.7-.8-2-1-.3-.1-.5-.2-.7.2-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1-1.6-.8-2.6-1.9-3.3-3.4-.1-.3 0-.4.2-.6.2-.2.3-.3.4-.5.1-.1.1-.2.2-.4.1-.2 0-.4 0-.5-.1-.2-.6-1.5-.8-2-.2-.5-.4-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.7.6-1 1.5-.7 2.5.8 2.3 2.3 4.1 4.3 5.4 1.4.9 2.7 1.2 3.6 1.5.4.1.8.1 1.1.1.3 0 .9-.3 1-0.7.1-.4.1-.8.1-.8-.2-.1-.4-.2-.5-.3z"
        fill="#25D366"
      />
    </svg>
  );
        }
