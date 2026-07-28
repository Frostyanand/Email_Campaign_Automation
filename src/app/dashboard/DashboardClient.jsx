"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UploadCloud, Play, Pause, Square, RotateCcw, AlertTriangle, CheckCircle2, ShieldCheck, Mail, Paperclip, X, FileText, Plus, FlaskConical, LogOut } from "lucide-react";

export default function DashboardClient() {
  const router = useRouter();

  // State
  const [fileStats, setFileStats] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [intervalOption, setIntervalOption] = useState("60");
  const [isTestMode, setIsTestMode] = useState(false);
  const [testTargetEmails, setTestTargetEmails] = useState("");
  const [smtpVerified, setSmtpVerified] = useState(false);
  const [campaignState, setCampaignState] = useState("Idle"); // Idle, Ready, Running, Paused, Completed, Cancelled, Error
  const [campaignId, setCampaignId] = useState("");
  const [previewRecipientId, setPreviewRecipientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Refs for background process
  const campaignStateRef = useRef(campaignState);
  const intervalOptionRef = useRef(intervalOption);
  const isTestModeRef = useRef(isTestMode);
  const testTargetEmailsRef = useRef(testTargetEmails);
  const recipientsRef = useRef(recipients);
  const runningRef = useRef(false);

  useEffect(() => {
    campaignStateRef.current = campaignState;
  }, [campaignState]);

  useEffect(() => {
    intervalOptionRef.current = intervalOption;
  }, [intervalOption]);

  useEffect(() => {
    isTestModeRef.current = isTestMode;
  }, [isTestMode]);

  useEffect(() => {
    testTargetEmailsRef.current = testTargetEmails;
  }, [testTargetEmails]);

  useEffect(() => {
    recipientsRef.current = recipients;
  }, [recipients]);

  // Load state from localStorage & fetch templates
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/templates");
        const data = await res.json();
        const validTemplates = data.templates || [];
        setTemplates(validTemplates);

        let initialTmpl = "partnership";
        const savedState = localStorage.getItem("outreach_campaign_state");
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            if (parsed.selectedTemplate && validTemplates.some(t => t.id === parsed.selectedTemplate)) {
              initialTmpl = parsed.selectedTemplate;
            }
            setFileStats(parsed.fileStats);
            recipientsRef.current = parsed.recipients || [];
            setRecipients(parsed.recipients || []);
            setUploadedAttachments(parsed.uploadedAttachments || parsed.selectedAttachments || []);
            setIntervalOption(parsed.intervalOption || "60");
            setIsTestMode(parsed.isTestMode || false);
            setTestTargetEmails(parsed.testTargetEmails || "");
            setSmtpVerified(parsed.smtpVerified || false);
            setCampaignState(parsed.campaignState === "Running" ? "Paused" : parsed.campaignState);
            setCampaignId(parsed.campaignId || "");
          } catch (e) {
            console.error("Failed to parse saved state", e);
          }
        }

        if (!validTemplates.some(t => t.id === initialTmpl) && validTemplates.length > 0) {
          initialTmpl = validTemplates[0].id;
        }
        setSelectedTemplate(initialTmpl);

        if (data.attachments && data.attachments.length > 0) {
          setUploadedAttachments(prev => prev.length === 0 ? data.attachments : prev);
        }
      } catch (err) {
        toast.error("Failed to load templates");
      }
      setLoadingInitial(false);
    };
    init();
  }, []);

  // Save state on change
  useEffect(() => {
    if (!loadingInitial && recipients.length > 0) {
      localStorage.setItem("outreach_campaign_state", JSON.stringify({
        fileStats,
        recipients,
        selectedTemplate,
        uploadedAttachments,
        intervalOption,
        isTestMode,
        testTargetEmails,
        smtpVerified,
        campaignState,
        campaignId
      }));
    }
  }, [fileStats, recipients, selectedTemplate, uploadedAttachments, intervalOption, isTestMode, testTargetEmails, smtpVerified, campaignState, campaignId, loadingInitial]);

  // Handlers
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const promise = fetch("/api/upload", { method: "POST", body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setFileStats({
          filename: data.data.filename,
          worksheets: data.data.worksheets,
          universitiesFound: data.data.universitiesFound,
          validRecipients: data.data.validRecipients,
          duplicateUniversitiesRemoved: data.data.duplicateUniversitiesRemoved,
          duplicateEmailsRemoved: data.data.duplicateEmailsRemoved,
          rowsIgnored: data.data.rowsIgnored
        });
        recipientsRef.current = data.data.recipients || [];
        setRecipients(data.data.recipients || []);
        setCampaignState("Ready");
        setCampaignId(`CMP-${format(new Date(), "yyyyMMdd-HHmmss")}`);
        setSmtpVerified(false);
      });

    toast.promise(promise, {
      loading: "Parsing Excel file...",
      success: "File parsed successfully",
      error: (err) => err.message
    });
  };

  const handleTemplateChange = (val) => {
    setSelectedTemplate(val);
  };

  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      const base64Files = await Promise.all(
        files.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resultStr = String(reader.result || "");
            const base64 = resultStr.includes(",") ? resultStr.split(",")[1] : resultStr;
            resolve({ filename: file.name, content: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );

      setUploadedAttachments(prev => {
        const combined = [...prev];
        base64Files.forEach(f => {
          const fname = f.filename;
          if (!combined.some(item => (typeof item === "string" ? item === fname : item.filename === fname))) {
            combined.push(f);
          }
        });
        return combined;
      });

      // Best effort backend sync
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      fetch("/api/upload-attachment", { method: "POST", body: formData }).catch(() => {});

      toast.success("Attachment(s) added successfully!");
    } catch (err) {
      toast.error("Failed to process attachment");
    }
    e.target.value = "";
  };

  const removeAttachment = async (att) => {
    const nameToRemove = typeof att === "string" ? att : att.filename;
    setUploadedAttachments(prev => prev.filter(item => (typeof item === "string" ? item !== nameToRemove : item.filename !== nameToRemove)));
    try {
      await fetch("/api/upload-attachment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: nameToRemove })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRecipientStatus = (id) => {
    setRecipients(prev => prev.map(r => 
      r.id === id ? { ...r, status: r.status === "Skipped" ? "Pending" : "Skipped" } : r
    ));
  };

  const verifySmtp = async () => {
    const promise = fetch("/api/verify-smtp").then(res => res.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setSmtpVerified(true);
    });

    toast.promise(promise, {
      loading: "Verifying SMTP connection...",
      success: "SMTP Verified!",
      error: (err) => err.message
    });
  };

  const sendTestEmail = async () => {
    if (!testEmailAddress || !selectedTemplate) return;
    
    const tmpl = templates.find(t => t.id === selectedTemplate);
    let html = tmpl.html;
    html = html.replace(/{{UNIVERSITY_NAME}}/g, "Test University");
    html = html.replace(/{{COUNTRY}}/g, "Test Country");
    html = html.replace(/{{TO_EMAIL}}/g, testEmailAddress);
    html = html.replace(/{{CURRENT_DATE}}/g, format(new Date(), "PP"));
    html = html.replace(/{{COMPANY_NAME}}/g, "Our Company");
    html = html.replace(/{{SENDER_NAME}}/g, "Admin");

    let subject = tmpl.subject;
    subject = subject.replace(/{{COMPANY_NAME}}/g, "Our Company");
    subject = subject.replace(/{{UNIVERSITY_NAME}}/g, "Test University");

    const promise = fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        subject,
        attachments: uploadedAttachments,
        to: testEmailAddress
      })
    }).then(res => res.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setShowTestEmailModal(false);
    });

    toast.promise(promise, {
      loading: "Sending test email...",
      success: "Test email sent!",
      error: (err) => err.message
    });
  };

  const startCampaign = () => {
    setShowConfirmModal(false);
    campaignStateRef.current = "Running";
    setCampaignState("Running");
    if (!runningRef.current) {
      runningRef.current = true;
      runCampaignLoop();
    }
  };

  const pauseCampaign = () => {
    campaignStateRef.current = "Paused";
    setCampaignState("Paused");
    runningRef.current = false;
  };

  const resumeCampaign = () => {
    campaignStateRef.current = "Running";
    setCampaignState("Running");
    if (!runningRef.current) {
      runningRef.current = true;
      runCampaignLoop();
    }
  };

  const stopCampaign = () => {
    campaignStateRef.current = "Cancelled";
    setCampaignState("Cancelled");
    runningRef.current = false;
  };

  const retryFailed = () => {
    setRecipients(prev => prev.map(r => r.status === "Failed" ? { ...r, status: "Pending", attempts: 0 } : r));
    setCampaignState("Ready");
  };

  const resetCampaign = () => {
    if (confirm("Are you sure you want to reset the entire campaign?")) {
      setFileStats(null);
      setRecipients([]);
      setCampaignState("Idle");
      localStorage.removeItem("outreach_campaign_state");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("outreach_campaign_state");
    toast.success("Logged out & session cleared");
    window.location.href = "/login";
  };

  // Campaign Engine Loop
  const runCampaignLoop = async () => {
    console.log("%c[Campaign Engine] STARTING LOOP", "color: #3b82f6; font-weight: bold", {
      mode: isTestModeRef.current ? "TEST MODE" : "LIVE MODE",
      state: campaignStateRef.current,
      totalRecipients: recipientsRef.current?.length || 0
    });

    try {
      while (campaignStateRef.current === "Running") {
        const currentRecipients = recipientsRef.current || [];
        const nextIndex = currentRecipients.findIndex(r => r.status === "Pending" || r.status === "Retrying");
        
        if (nextIndex === -1) {
          console.log("%c[Campaign Engine] COMPLETED: No pending recipients remaining.", "color: #22c55e; font-weight: bold");
          campaignStateRef.current = "Completed";
          setCampaignState("Completed");
          toast.success("Campaign Completed!");
          break;
        }

        const recipient = currentRecipients[nextIndex];
        const attempt = recipient.attempts + 1;
        
        console.log(`%c[Campaign Engine] [${nextIndex + 1}/${currentRecipients.length}] Sending to: ${recipient.university}`, "color: #eab308", {
          university: recipient.university,
          to: recipient.to,
          cc: recipient.cc,
          attempt
        });

        // Update state to sending
        const updatedRecipientsSending = currentRecipients.map((r, i) => 
          i === nextIndex ? { ...r, status: "Sending", attempts: attempt } : r
        );
        recipientsRef.current = updatedRecipientsSending;
        setRecipients(updatedRecipientsSending);

        const tmpl = templates.find(t => t.id === selectedTemplate);
        if (!tmpl) {
          console.error("[Campaign Engine] ERROR: Selected template not found!", selectedTemplate);
          pauseCampaign();
          toast.error("Template not found!");
          break;
        }

        let html = tmpl.html;
        html = html.replace(/{{UNIVERSITY_NAME}}/g, recipient.university || "");
        html = html.replace(/{{COUNTRY}}/g, recipient.country || "");
        html = html.replace(/{{TO_EMAIL}}/g, recipient.to || "");
        html = html.replace(/{{CURRENT_DATE}}/g, format(new Date(), "PP"));
        html = html.replace(/{{COMPANY_NAME}}/g, "Our Company");
        html = html.replace(/{{SENDER_NAME}}/g, "Admin");

        let subject = tmpl.subject;
        subject = subject.replace(/{{COMPANY_NAME}}/g, "Our Company");
        subject = subject.replace(/{{UNIVERSITY_NAME}}/g, recipient.university || "");

        let overrideTo = null;
        if (isTestModeRef.current) {
          const rawList = testTargetEmailsRef.current.trim();
          if (rawList) {
            const emailList = rawList.split(",").map(e => e.trim()).filter(Boolean);
            if (emailList.length > 0) {
              overrideTo = emailList[nextIndex % emailList.length];
            }
          }
          if (!overrideTo) {
            overrideTo = "satyashish@wegbruck.com";
          }
        }

        console.log(`[Campaign Engine] Requesting POST /api/send-email ... Target To: ${overrideTo || recipient.to}`);

        try {
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              recipient,
              html,
              subject,
              attachments: uploadedAttachments,
              attempt,
              overrideTo
            })
          });
          const data = await res.json();
          
          if (res.ok && data.success) {
            console.log(`%c[Campaign Engine] SUCCESS for ${recipient.university}`, "color: #22c55e", data);
            const updatedRecipientsSent = recipientsRef.current.map((r, i) => 
              i === nextIndex ? { ...r, status: "Sent", sentTime: data.timestamp } : r
            );
            recipientsRef.current = updatedRecipientsSent;
            setRecipients(updatedRecipientsSent);

            if (isTestModeRef.current) {
              toast.success(`[Test Mode] Sent to ${overrideTo} (${recipient.university})`);
            } else {
              toast.success(`Sent email to ${recipient.university}`);
            }
          } else {
            console.error(`[Campaign Engine] SERVER ERROR for ${recipient.university}:`, data.error || data);
            throw new Error(data.error || "Failed to send email");
          }
        } catch (error) {
          console.error(`[Campaign Engine] FAILED for ${recipient.university} (Attempt ${attempt}/3):`, error.message);
          toast.error(`Error sending to ${recipient.university}: ${error.message}`);

          if (attempt < 4) {
            const delays = [
              [30, 40],
              [60, 80],
              [120, 150]
            ];
            const [min, max] = delays[attempt - 1];
            const delaySecs = Math.floor(Math.random() * (max - min + 1)) + min;
            
            console.warn(`[Campaign Engine] Will retry ${recipient.university} in ${delaySecs}s...`);

            const updatedRecipientsRetry = recipientsRef.current.map((r, i) => 
              i === nextIndex ? { ...r, status: "Retrying", error: error.message } : r
            );
            recipientsRef.current = updatedRecipientsRetry;
            setRecipients(updatedRecipientsRetry);
            
            if (campaignStateRef.current === "Running") {
              await new Promise(r => setTimeout(r, delaySecs * 1000));
              continue;
            }
          } else {
            const updatedRecipientsFailed = recipientsRef.current.map((r, i) => 
              i === nextIndex ? { ...r, status: "Failed", error: error.message } : r
            );
            recipientsRef.current = updatedRecipientsFailed;
            setRecipients(updatedRecipientsFailed);
          }
        }

        // Calculate random delay for next email based on interval option
        if (campaignStateRef.current === "Running") {
          const intervalBase = parseInt(intervalOptionRef.current, 10);
          const minDelay = Math.max(1, Math.floor(intervalBase * 0.9));
          const maxDelay = Math.max(1, Math.floor(intervalBase * 1.1));
          const delaySecs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          
          console.log(`[Campaign Engine] Waiting ${delaySecs}s until next email dispatch...`);
          await new Promise(r => setTimeout(r, delaySecs * 1000));
        }
      }
    } catch (fatalErr) {
      console.error("[Campaign Engine] Fatal unhandled loop error:", fatalErr);
    } finally {
      console.log("%c[Campaign Engine] LOOP TERMINATED. State:", "color: #9ca3af", campaignStateRef.current);
      runningRef.current = false;
    }
  };

  const getPreviewHtml = () => {
    if (!previewRecipientId || !selectedTemplate) return "";
    const tmpl = templates.find(t => t.id === selectedTemplate);
    const recipient = recipients.find(r => r.id === previewRecipientId);
    if (!tmpl || !recipient) return "";

    let html = tmpl.html;
    html = html.replace(/{{UNIVERSITY_NAME}}/g, recipient.university || "");
    html = html.replace(/{{COUNTRY}}/g, recipient.country || "");
    html = html.replace(/{{TO_EMAIL}}/g, recipient.to || "");
    html = html.replace(/{{CURRENT_DATE}}/g, format(new Date(), "PP"));
    html = html.replace(/{{COMPANY_NAME}}/g, "Our Company");
    html = html.replace(/{{SENDER_NAME}}/g, "Admin");
    return html;
  };

  const getPreviewSubject = () => {
    if (!previewRecipientId || !selectedTemplate) return "";
    const tmpl = templates.find(t => t.id === selectedTemplate);
    const recipient = recipients.find(r => r.id === previewRecipientId);
    if (!tmpl || !recipient) return "";
    
    let subject = tmpl.subject;
    subject = subject.replace(/{{COMPANY_NAME}}/g, "Our Company");
    subject = subject.replace(/{{UNIVERSITY_NAME}}/g, recipient.university || "");
    return subject;
  };

  const filteredRecipients = recipients.filter(r => 
    r.university?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.cc && r.cc.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const stats = {
    total: recipients.length,
    pending: recipients.filter(r => r.status === "Pending").length,
    sending: recipients.filter(r => r.status === "Sending").length,
    sent: recipients.filter(r => r.status === "Sent").length,
    failed: recipients.filter(r => r.status === "Failed").length,
    retrying: recipients.filter(r => r.status === "Retrying").length,
    skipped: recipients.filter(r => r.status === "Skipped").length,
  };
  const progressPct = stats.total > 0 ? ((stats.sent + stats.failed + stats.skipped) / stats.total) * 100 : 0;
  const estimatedRemainingMins = Math.ceil((stats.pending * parseInt(intervalOption, 10)) / 60);

  if (loadingInitial) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Outreach Dashboard
            {isTestMode && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                <FlaskConical className="w-3.5 h-3.5" /> TEST MODE ACTIVE
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isTestMode 
              ? "Sanity Run Mode: All campaign emails will be redirected to your test email address(es)." 
              : "Live Campaign Mode: Outgoing emails will be sent directly to university recipients."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setIsTestMode(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!isTestMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              disabled={campaignState === "Running"}
            >
              Live Mode
            </button>
            <button
              type="button"
              onClick={() => setIsTestMode(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${isTestMode ? "bg-amber-500/20 text-amber-400 font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              disabled={campaignState === "Running"}
            >
              <FlaskConical className="w-3.5 h-3.5" /> Test Mode
            </button>
          </div>
          {campaignId && <Badge variant="outline" className="text-sm">ID: {campaignId}</Badge>}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      {isTestMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-amber-400">Test Mode (Sanity Run) is enabled: </span>
              All campaign emails will be redirected to your test email address(es) instead of actual university inboxes.
            </div>
          </div>
        </div>
      )}

      {!fileStats ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel Workbook</CardTitle>
            <CardDescription>Upload a .xlsx or .xls file (Max 20MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="excel-upload" className="cursor-pointer text-primary hover:underline">
                Click to browse
                <Input id="excel-upload" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">Each worksheet should be a country.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">File:</span> {fileStats.filename}</div>
                <div><span className="text-muted-foreground">Worksheets:</span> {fileStats.worksheets}</div>
                <div><span className="text-muted-foreground">Universities Found:</span> {fileStats.universitiesFound}</div>
                <div><span className="text-muted-foreground">Valid Recipients:</span> {fileStats.validRecipients}</div>
                <div>
                  <span className="text-muted-foreground">Duplicates Removed:</span>{" "}
                  {fileStats.duplicateUniversitiesRemoved + fileStats.duplicateEmailsRemoved > 0 ? (
                    <button 
                      type="button" 
                      onClick={() => setShowDuplicatesModal(true)}
                      className="font-semibold text-amber-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {fileStats.duplicateUniversitiesRemoved + fileStats.duplicateEmailsRemoved}
                      <span className="text-[11px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                        View Details 🔍
                      </span>
                    </button>
                  ) : (
                    <span>0</span>
                  )}
                </div>
                <div><span className="text-muted-foreground">Rows Ignored:</span> {fileStats.rowsIgnored}</div>
                <div><span className="text-muted-foreground">Ready To Send:</span> {stats.total}</div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange} disabled={campaignState === "Running"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex flex-col space-y-2.5 mt-1">
                  <Input 
                    type="file" 
                    multiple 
                    id="attachment-upload" 
                    className="hidden" 
                    onChange={handleAttachmentUpload}
                    disabled={campaignState === "Running"}
                  />
                  <Label 
                    htmlFor="attachment-upload" 
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-border p-2.5 rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm font-medium"
                  >
                    <Paperclip className="w-4 h-4 text-primary" /> Upload Attachment(s)
                  </Label>

                  {uploadedAttachments.length > 0 ? (
                    <div className="space-y-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                      {uploadedAttachments.map((att) => {
                        const fname = typeof att === "string" ? att : att.filename;
                        return (
                          <div key={fname} className="flex items-center justify-between bg-secondary/40 border border-border/50 px-2.5 py-1.5 rounded text-xs font-mono">
                            <span className="truncate max-w-[180px] flex items-center gap-1.5" title={fname}>
                              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              {fname}
                            </span>
                            <button 
                              type="button"
                              onClick={() => removeAttachment(att)}
                              className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                              disabled={campaignState === "Running"}
                              title="Remove attachment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No files attached to campaign</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sending Interval</Label>
                <Select value={intervalOption} onValueChange={setIntervalOption} disabled={campaignState === "Running"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">±10% randomized delay per email</p>
              </div>

              {isTestMode && (
                <div className="space-y-2 md:col-span-3 bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                  <Label htmlFor="test-target-emails" className="text-amber-300 font-semibold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" /> Test Target Email Address(es)
                  </Label>
                  <Input 
                    id="test-target-emails"
                    placeholder="e.g. test@yourdomain.com, admin@yourdomain.com"
                    value={testTargetEmails}
                    onChange={(e) => setTestTargetEmails(e.target.value)}
                    disabled={campaignState === "Running"}
                    className="bg-background border-amber-500/40 text-sm font-mono"
                  />
                  <p className="text-xs text-amber-300/80">
                    Enter one or more test emails (comma-separated). During this test run, outgoing emails will cycle through these addresses with full university placeholder substitutions and attachments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recipients</CardTitle>
              <Input 
                placeholder="Search..." 
                className="w-64" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Use</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Email Addresses</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipients.map(r => {
                      let rSubj = "";
                      if (selectedTemplate) {
                         const tmpl = templates.find(t => t.id === selectedTemplate);
                         if (tmpl) {
                           rSubj = tmpl.subject.replace(/{{COMPANY_NAME}}/g, "Our Company").replace(/{{UNIVERSITY_NAME}}/g, r.university || "");
                         }
                      }
                      
                      return (
                        <TableRow key={r.id} className={previewRecipientId === r.id ? "bg-muted/50" : ""} onClick={() => setPreviewRecipientId(r.id)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={r.status !== "Skipped"} 
                              onCheckedChange={() => toggleRecipientStatus(r.id)}
                              disabled={campaignState === "Running" || r.status === "Sent"}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{r.university}</TableCell>
                          <TableCell>{r.country}</TableCell>
                          <TableCell className="max-w-[240px]">
                            <div className="font-mono text-xs truncate" title={r.to}>{r.to}</div>
                            {r.cc && r.cc.length > 0 && (
                              <div className="text-[11px] text-amber-400 font-mono mt-0.5 truncate" title={`CC: ${r.cc.join(", ")}`}>
                                <span className="font-semibold text-amber-500">CC:</span> {r.cc.join(", ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{rSubj}</TableCell>
                          <TableCell>
                            <Badge variant={
                              r.status === "Sent" ? "default" :
                              r.status === "Failed" ? "destructive" :
                              r.status === "Sending" ? "secondary" :
                              "outline"
                            }>{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Email Preview */}
          {previewRecipientId && selectedTemplate && (
            <Card className="border-blue-500/30 shadow-lg">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center"><Mail className="w-4 h-4 mr-2" /> Email Preview</CardTitle>
                <div className="space-y-1 mt-4 text-sm">
                  <div><span className="font-semibold w-16 inline-block">To:</span> {recipients.find(r => r.id === previewRecipientId)?.to}</div>
                  <div><span className="font-semibold w-16 inline-block">CC:</span> {recipients.find(r => r.id === previewRecipientId)?.cc.join(", ") || "None"}</div>
                  <div><span className="font-semibold w-16 inline-block">Subject:</span> {getPreviewSubject()}</div>
                  <div><span className="font-semibold w-16 inline-block">Attach:</span> {uploadedAttachments.length > 0 ? uploadedAttachments.join(", ") : "None"}</div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none border rounded p-4 bg-background"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                />
              </CardContent>
            </Card>
          )}

          {/* Campaign Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {!smtpVerified ? (
                <Button onClick={verifySmtp} variant="default">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Verify SMTP to Unlock
                </Button>
              ) : (
                <>
                  {campaignState === "Ready" || campaignState === "Idle" ? (
                    <Button onClick={() => setShowConfirmModal(true)} disabled={!selectedTemplate || stats.pending === 0}>
                      <Play className="w-4 h-4 mr-2" /> Start Campaign
                    </Button>
                  ) : null}

                  {campaignState === "Running" && (
                    <Button onClick={pauseCampaign} variant="secondary">
                      <Pause className="w-4 h-4 mr-2" /> Pause
                    </Button>
                  )}

                  {campaignState === "Paused" && (
                    <Button onClick={resumeCampaign} variant="default">
                      <Play className="w-4 h-4 mr-2" /> Resume
                    </Button>
                  )}

                  {(campaignState === "Running" || campaignState === "Paused") && (
                    <Button onClick={stopCampaign} variant="destructive">
                      <Square className="w-4 h-4 mr-2" /> Stop
                    </Button>
                  )}

                  {(campaignState === "Completed" || campaignState === "Cancelled" || stats.failed > 0) && (
                    <Button onClick={retryFailed} variant="outline" disabled={stats.failed === 0}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Retry Failed
                    </Button>
                  )}

                  <Button onClick={resetCampaign} variant="ghost" className="ml-auto text-destructive hover:text-destructive">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Reset Everything
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Progress Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{progressPct.toFixed(1)}% Completed</span>
                <span>Est. Remaining: {estimatedRemainingMins} mins</span>
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-center mt-4">
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground uppercase">Total</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground uppercase">Pending</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold text-blue-500">{stats.sending}</div>
                  <div className="text-xs text-muted-foreground uppercase">Sending</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold text-green-500">{stats.sent}</div>
                  <div className="text-xs text-muted-foreground uppercase">Sent</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                  <div className="text-xs text-muted-foreground uppercase">Failed</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold text-orange-500">{stats.retrying}</div>
                  <div className="text-xs text-muted-foreground uppercase">Retrying</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-2xl font-bold text-gray-500">{stats.skipped}</div>
                  <div className="text-xs text-muted-foreground uppercase">Skipped</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Campaign</DialogTitle>
            <DialogDescription>
              You are about to send automated emails. Please review the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isTestMode && (
              <div className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-md text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                  <FlaskConical className="w-4 h-4" /> TEST MODE ACTIVE (Sanity Run)
                </div>
                <div>
                  Emails will NOT go to real university recipients. All emails will be redirected to: <span className="font-mono underline">{testTargetEmails || "Default Admin Email"}</span>.
                </div>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Total Emails to Send:</span>
              <span>{stats.pending} emails</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Estimated Duration:</span>
              <span>~{estimatedRemainingMins} minutes</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Attachments:</span>
              <span>{uploadedAttachments.length}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="font-medium">Template:</span>
              <span>{templates.find(t => t.id === selectedTemplate)?.name}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button onClick={startCampaign}>Confirm & Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicates Breakdown Modal */}
      <Dialog open={showDuplicatesModal} onOpenChange={setShowDuplicatesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Deduplication Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed record of duplicate university names and email addresses detected and safely skipped.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 mt-2 border rounded-md p-1">
            {fileStats?.duplicatesList && fileStats.duplicatesList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Type</TableHead>
                    <TableHead>University Name</TableHead>
                    <TableHead>Worksheet / Country</TableHead>
                    <TableHead>Reason & Original Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileStats.duplicatesList.map((dup, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={dup.type.includes("University") ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-blue-500/50 text-blue-400 bg-blue-500/10"}
                        >
                          {dup.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{dup.university}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{dup.country}</TableCell>
                      <TableCell className="text-muted-foreground">{dup.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No duplicate entries detected in this Excel workbook.
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDuplicatesModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Modal */}
      <Dialog open={showTestEmailModal} onOpenChange={setShowTestEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              This will send a test email to your own address using the selected template and attachments, with placeholder values.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Test Email Address</Label>
              <Input 
                type="email" 
                placeholder="your.email@example.com" 
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestEmailModal(false)}>Cancel</Button>
            <Button onClick={sendTestEmail} disabled={!testEmailAddress}>Send Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
