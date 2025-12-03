import { useState, useEffect } from 'react';
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
  Filter,
  Edit,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  linkedin_url?: string;
  whatsapp?: string;
  created_at: string;
  tags?: string[];
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
        setContacts(data || []);
      }
      setIsLoading(false);
    };

    loadContacts();
  }, [user, toast]);

  // Apply filters
  useEffect(() => {
    let filtered = [...contacts];

    // Tag filter
    if (activeTagFilter !== 'All') {
      filtered = filtered.filter(contact => {
        const tags = contact.tags || [];
        // For event tags, check if any tag starts with "Event:"
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

  // Extract unique event tags from all contacts
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

  // Get all unique tags for filter chips
  const getAllFilterTags = () => {
    const allTags = [
      ...TEMPERATURE_TAGS,
      ...RELATIONSHIP_TAGS,
      ...SOURCE_TAGS,
      ...getEventTags(),
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

  const handleWhatsApp = (whatsapp?: string) => {
    if (!whatsapp) return;
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
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
    
    // Check if contact has event tag
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
    if (!editingContact) return;

    let finalTags = [...selectedTags];

    // Add custom tag if provided
    if (customTag.trim()) {
      finalTags.push(customTag.trim());
    }

    // Add event tag if enabled
    if (eventTagEnabled && eventName.trim()) {
      // Remove any existing event tags
      finalTags = finalTags.filter(tag => !tag.startsWith('Event:'));
      finalTags.push(`Event: ${eventName.trim()}`);
    } else {
      // Remove event tags if disabled
      finalTags = finalTags.filter(tag => !tag.startsWith('Event:'));
    }

    // Update contact
    const { error } = await supabase
      .from('contacts')
      .update({ 
        tags: finalTags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingContact.id);

    if (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update tags.',
        variant: 'destructive',
      });
      return;
    }

    // Update local state
    setContacts(contacts.map(c => 
      c.id === editingContact.id ? { ...c, tags: finalTags } : c
    ));

    toast({
      title: 'Tags Updated',
      description: 'Contact tags have been updated successfully.',
    });

    setTagModalOpen(false);
    setEditingContact(null);
  };

  const openBulkEdit = () => {
    // Pre-select all filtered contacts
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

    let tagsToAdd = [...bulkTags];

    // Add custom tag
    if (bulkCustomTag.trim()) {
      tagsToAdd.push(bulkCustomTag.trim());
    }

    // Add event tag
    if (bulkEventEnabled && bulkEventName.trim()) {
      tagsToAdd.push(`Event: ${bulkEventName.trim()}`);
    }

    // Update all selected contacts
    const updates = Array.from(bulkSelectedContacts).map(async (contactId) => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const existingTags = contact.tags || [];
      const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));

      return supabase
        .from('contacts')
        .update({ 
          tags: mergedTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);
    });

    await Promise.all(updates);

    // Reload contacts
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      setContacts(data);
    }

    toast({
      title: 'Bulk Update Complete',
      description: `Updated tags for ${bulkSelectedContacts.size} contact(s).`,
    });

    setBulkEditModalOpen(false);
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
                  <Label className="text-xs font-medium text-slate-600">Filter by Tag</Label>
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
                    {/* Mobile Layout - Stacked Card */}
                    <div className="block md:hidden p-4 space-y-2">
                      {/* Tags Row */}
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

                      {/* Name */}
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {contact.name}
                      </h3>
                      
                      {/* Email */}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {contact.email}
                          </p>
                        </div>
                      )}
                      
                      {/* Phone + WhatsApp Row */}
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
                            onClick={() => handleWhatsApp(contact.whatsapp)}
                            className="h-7 px-3 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                      
                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
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

                      {/* Created Date */}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Added on {formatDateTime(contact.created_at)}
                      </p>
                    </div>

                    {/* Desktop/Tablet Layout - Grid */}
                    <div className="hidden md:grid md:grid-cols-[minmax(160px,2fr)_minmax(160px,2fr)_minmax(120px,1.5fr)_minmax(140px,1fr)] gap-3 p-5 items-center">
                      {/* Name + Tags Column */}
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
                      
                      {/* Email Column */}
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
                      
                      {/* Phone Column */}
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
                      
                      {/* Actions Column */}
                      <div className="flex items-center gap-2 justify-end">
                        {contact.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(contact.whatsapp)}
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
            {/* Temperature Tags */}
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

            {/* Relationship Tags */}
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

            {/* Source Tags */}
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

            {/* Status Tags */}
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

            {/* Event Tag */}
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

            {/* Custom Tag */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Tag</Label>
              <Input
                placeholder="Enter custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
              />
            </div>

            {/* Save Button */}
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
            {/* Selected Contacts Count */}
            <p className="text-sm text-slate-600">
              {bulkSelectedContacts.size} contact{bulkSelectedContacts.size !== 1 ? 's' : ''} selected
            </p>

            {/* Contact Selection List */}
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

            {/* Tag Selection */}
            <div className="space-y-4">
              {/* Temperature */}
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

              {/* Relationship */}
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

              {/* Source */}
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

              {/* Status */}
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

              {/* Event Tag */}
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

              {/* Custom Tag */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Tag</Label>
                <Input
                  placeholder="Enter custom tag..."
                  value={bulkCustomTag}
                  onChange={(e) => setBulkCustomTag(e.target.value)}
                />
              </div>
            </div>

            {/* Apply Button */}
            <Button onClick={handleBulkApply} className="w-full gradient-bg">
              Apply to Selected Contacts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
