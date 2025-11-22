"use client";

import ComingSoonTooltip from "@/components/coming-soon.tooltip";
import { cn } from "@/lib/utils";
import { ArrowUp, Paperclip } from "lucide-react";
import React, { useEffect } from "react";

interface PresentationInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PresentationInput({
  onSubmit,
  placeholder = "What can I build for you today?",
  className,
  disabled = false,
}: PresentationInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.trim() && onSubmit && !disabled) {
      onSubmit(value.trim());
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Handle file upload
      console.log("Files selected:", files);
    }
  };

  const handleImport = () => {
    // Handle Figma import
    console.log("Import from Figma");
  };

  useEffect(() => {
    fileInputRef?.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        "w-full flex flex-col mx-auto overflow-hidden relative rounded-[20px]",
        "bg-white dark:bg-zinc-900 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.1)] dark:shadow-[0px_4px_10px_0px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      {/* Textarea Section */}
      <div className="relative grow h-full max-sm:overflow-auto">
        <textarea
          ref={textareaRef}
          name="prompt"
          rows={4}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="block relative z-10 resize-none overflow-auto py-5 pb-0 px-5 w-full max-h-[250px] min-h-[80px] bg-transparentplaceholder:opacity-50 dark:placeholder:opacity-80 text-[14px] placeholder:text-[14px] focus:outline-none leading-[150%] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="prompt"
        />
      </div>

      {/* Bottom Section */}
      <div className="px-5 pb-3 pt-3 flex w-full relative z-10">
        {/* Left Side - Actions */}
        <div className="flex gap-2 grow">
          <div className="relative w-max">
            <div className="flex gap-2">
              {/* File Input Button */}
              <div>
                <input
                  ref={fileInputRef}
                  id="fileInput"
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  type="file"
                  name="files"
                  onChange={handleFileChange}
                  multiple
                />
                <ComingSoonTooltip>
                  <button
                    type="button"
                    onClick={handleFileClick}
                    disabled={true}
                    className={cn(
                      "relative flex items-center justify-center cursor-pointer bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 w-[26px] h-[26px] rounded-md transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="Attach"
                  >
                    <div className="w-full flex items-center justify-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-[16px] h-[16px] flex justify-center items-center">
                          <Paperclip className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                </ComingSoonTooltip>
              </div>

              {/* Import Button - Hidden on mobile */}
              {/* <div className="max-sm:hidden">
                <button
                  type="button"
                  onClick={handleImport}
                  className="relative flex w-max items-center justify-center cursor-pointer bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 py-[5px] px-3 h-[26px] rounded-md transition-colors"
                  aria-label="Import from Figma"
                >
                  <div className="w-full flex items-center justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-[16px] h-[16px] flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 200 300"
                          width="14px"
                          height="14px"
                          role="presentation"
                          className="fill-current"
                        >
                          <title>Figma</title>
                          <path
                            fill="#0acf83"
                            d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z"
                          />
                          <path
                            fill="#a259ff"
                            d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z"
                          />
                          <path
                            fill="#f24e1e"
                            d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z"
                          />
                          <path
                            fill="#ff7262"
                            d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z"
                          />
                          <path
                            fill="#1abcfe"
                            d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z"
                          />
                        </svg>
                      </span>
                      <p className="text-[12px] leading-[150%] text-black dark:text-white">
                        Import
                      </p>
                    </div>
                  </div>
                </button>
              </div> */}
            </div>
          </div>
        </div>

        {/* Right Side - Submit Button */}
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={cn(
              "relative flex items-center justify-center cursor-pointer w-[26px] h-[26px] rounded-md transition-colors",
              value.trim() && !disabled
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-80"
            )}
            aria-label="Submit prompt"
            aria-disabled={!value.trim() || disabled}
          >
            <div className="w-full flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center gap-1">
                <div className="w-[16px] h-[16px] flex justify-center items-center">
                  <ArrowUp className="w-4 h-4" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
