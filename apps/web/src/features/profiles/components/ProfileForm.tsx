"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { RELATIONSHIP_TYPES, type ProfilePayload } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import Textarea from "@/components/atoms/Textarea";
import DatePicker from "@/components/atoms/DatePicker";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import { useLeaveGuard } from "@/shared/hooks/use-leave-guard";
import { toISODate, todayDate } from "@/shared/lib/dates";
import { cn } from "@/lib/utils";
import { FIELD_LABELS, PROFILE_SECTIONS, type ProfileFieldKey } from "../sections";
import { profileFormSchema, toProfilePayload, type ProfileFormValues } from "../form";
import SheetSection from "./SheetSection";
import FormActionBar from "./FormActionBar";
import ChipListField from "./fields/ChipListField";
import TopSongsField from "./fields/TopSongsField";
import TheirSongField from "./fields/TheirSongField";

const RELATIONSHIP_OPTIONS = RELATIONSHIP_TYPES.map((type) => ({ value: type, label: type }));

/** Fields that take the sheet's full width; the rest pair up on wide screens. */
const WIDE: ReadonlySet<ProfileFieldKey> = new Set([
  "tags",
  "associated_song",
  "top_songs",
  "long_term_goals",
  "favorite_memories",
  "notes",
  "quotes",
]);

interface EditorProps {
  control: Control<ProfileFormValues>;
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
}

const today = toISODate(todayDate());

/** One editor per field. The section a field appears in comes from sections.ts. */
const EDITORS: Record<ProfileFieldKey, (p: EditorProps) => ReactNode> = {
  profession: ({ register, errors }) => (
    <Input
      label={FIELD_LABELS.profession}
      error={errors.profession?.message}
      {...register("profession")}
    />
  ),
  birthday: ({ control, errors }) => (
    <Controller
      control={control}
      name="birthday"
      render={({ field }) => (
        <DatePicker
          label={FIELD_LABELS.birthday}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          max={today}
          placeholder="Pick their birthday"
          error={errors.birthday?.message}
        />
      )}
    />
  ),
  tags: ({ control }) => (
    <ChipListField control={control} name="tags" label="Tags" placeholder="Add a tag" kind="tag" />
  ),
  favorite_movie: ({ register, errors }) => (
    <Input
      label={FIELD_LABELS.favorite_movie}
      error={errors.favorite_movie?.message}
      {...register("favorite_movie")}
    />
  ),
  favorite_book: ({ register, errors }) => (
    <Input
      label={FIELD_LABELS.favorite_book}
      error={errors.favorite_book?.message}
      {...register("favorite_book")}
    />
  ),
  music_preference: ({ register, errors }) => (
    <Input
      label={FIELD_LABELS.music_preference}
      error={errors.music_preference?.message}
      {...register("music_preference")}
    />
  ),
  associated_song: ({ register, errors }) => <TheirSongField register={register} errors={errors} />,
  top_songs: ({ control }) => <TopSongsField control={control} />,
  movie_genres: ({ control }) => (
    <ChipListField
      control={control}
      name="movie_genres"
      label={FIELD_LABELS.movie_genres}
      placeholder="Add a genre"
    />
  ),
  book_genres: ({ control }) => (
    <ChipListField
      control={control}
      name="book_genres"
      label={FIELD_LABELS.book_genres}
      placeholder="Add a genre"
    />
  ),
  hangout_places: ({ control }) => (
    <ChipListField
      control={control}
      name="hangout_places"
      label={FIELD_LABELS.hangout_places}
      placeholder="Add a place"
    />
  ),
  food_restrictions: ({ control }) => (
    <ChipListField
      control={control}
      name="food_restrictions"
      label={FIELD_LABELS.food_restrictions}
      placeholder="Add a restriction"
    />
  ),
  political_views: ({ control }) => (
    <ChipListField
      control={control}
      name="political_views"
      label={FIELD_LABELS.political_views}
      placeholder="Add a view"
    />
  ),
  long_term_goals: ({ register, errors }) => (
    <Textarea
      label={FIELD_LABELS.long_term_goals}
      rows={3}
      error={errors.long_term_goals?.message}
      {...register("long_term_goals")}
    />
  ),
  favorite_memories: ({ control }) => (
    <ChipListField
      control={control}
      name="favorite_memories"
      label={FIELD_LABELS.favorite_memories}
      placeholder="Add a memory"
      kind="memory"
    />
  ),
  notes: ({ register, errors }) => (
    <Textarea
      label={FIELD_LABELS.notes}
      rows={4}
      placeholder="Anything else worth remembering…"
      error={errors.notes?.message}
      {...register("notes")}
    />
  ),
  quotes: ({ control }) => (
    <ChipListField
      control={control}
      name="quotes"
      label={FIELD_LABELS.quotes}
      placeholder="Add something they said"
      kind="quote"
    />
  ),
};

/**
 * Editing a profile is the same sheet of paper as reading one: the same hero
 * at the top, the same sections in the same order with the same tape, the
 * same fields in each. Only the state differs.
 */
export default function ProfileForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  cancelHref,
}: {
  initialValues: ProfileFormValues;
  onSubmit: (payload: ProfilePayload) => Promise<unknown>;
  isSubmitting: boolean;
  submitLabel: string;
  cancelHref: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
  });

  const guard = useLeaveGuard(isDirty && !isSubmitting);

  // A successful save navigates with router.push, which the guard never sees.
  const submit = handleSubmit((values) => onSubmit(toProfilePayload(values)));

  const editorProps = { control, register, errors };

  return (
    // Bottom padding clears the fixed action bar so the last field is reachable.
    <form onSubmit={submit} noValidate className="pb-28">
      <div className="paper rounded-[28px] px-5 py-7 sm:px-9 sm:py-9">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Full name"
            required
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <Input
            label="Pronouns"
            placeholder="e.g. she/her, they/them"
            error={errors.pronouns?.message}
            {...register("pronouns")}
          />
          <Controller
            control={control}
            name="relationship_type"
            render={({ field }) => (
              <Select
                label="Relationship"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={RELATIONSHIP_OPTIONS}
              />
            )}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Bio"
              rows={4}
              placeholder="How you know them, who they are to you…"
              error={errors.bio?.message}
              {...register("bio")}
            />
          </div>
        </div>

        <hr className="mt-8 border-0 border-t border-line" />

        {PROFILE_SECTIONS.map((section, index) => (
          <SheetSection key={section.id} section={section} index={index}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {section.fields.map((key) => (
                <div key={key} className={cn(WIDE.has(key) && "md:col-span-2")}>
                  {EDITORS[key](editorProps)}
                </div>
              ))}
            </div>
          </SheetSection>
        ))}
      </div>

      <FormActionBar
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />

      <ConfirmDialog
        isOpen={guard.pendingHref !== null}
        eyebrow="Unsaved changes"
        title="Leave without saving?"
        description="What you've changed on this profile will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onConfirm={guard.leave}
        onCancel={guard.stay}
      />
    </form>
  );
}
