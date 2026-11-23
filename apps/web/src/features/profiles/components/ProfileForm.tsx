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
  "music_preference",
  "long_term_goals",
  "favorite_memories",
  "notes",
  "quotes",
]);

interface EditorProps {
  control: Control<ProfileFormValues>;
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  /** The field has its section to itself, so the section's heading is its label. */
  solo: boolean;
}

const today = toISODate(todayDate());

/** One editor per field. Which section a field sits in, and where, comes from sections.ts. */
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
    <ChipListField control={control} name="tags" label="Tags" placeholder="Add a tag" />
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
  associated_song: ({ register, errors, solo }) => (
    <TheirSongField register={register} errors={errors} hideLabel={solo} />
  ),
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
  long_term_goals: ({ register, errors, solo }) => (
    <Textarea
      label={FIELD_LABELS.long_term_goals}
      hideLabel={solo}
      rows={3}
      placeholder="Where they want to be in a few years…"
      error={errors.long_term_goals?.message}
      {...register("long_term_goals")}
    />
  ),
  favorite_memories: ({ control, solo }) => (
    <ChipListField
      control={control}
      name="favorite_memories"
      label={FIELD_LABELS.favorite_memories}
      hideLabel={solo}
      placeholder="Add a memory"
      kind="memory"
    />
  ),
  notes: ({ register, errors, solo }) => (
    <Textarea
      label={FIELD_LABELS.notes}
      hideLabel={solo}
      rows={4}
      placeholder="Anything else worth remembering…"
      error={errors.notes?.message}
      {...register("notes")}
    />
  ),
  quotes: ({ control, solo }) => (
    <ChipListField
      control={control}
      name="quotes"
      label={FIELD_LABELS.quotes}
      hideLabel={solo}
      placeholder="Add something they said"
      kind="quote"
    />
  ),
};

/**
 * Editing a profile mirrors reading one. The first panel holds what the
 * profile page shows in its coloured header, in the same order: name, who they
 * are to you, what they do, birthday, bio, tags. Then come the sections of
 * `PROFILE_SECTIONS`, under the same titles and in the same order as the page.
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

  const editorProps = { control, register, errors, solo: false };

  return (
    // Bottom padding clears the fixed action bar so the last field is reachable.
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-32">
      <section
        aria-label="Who they are"
        className="panel-person rounded-[1.75rem] px-5 py-6 sm:p-8"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Full name"
              required
              error={errors.full_name?.message}
              {...register("full_name")}
            />
          </div>
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
          <Input
            label="Pronouns"
            placeholder="e.g. she/her, they/them"
            error={errors.pronouns?.message}
            {...register("pronouns")}
          />
          {EDITORS.profession(editorProps)}
          {EDITORS.birthday(editorProps)}
          <div className="md:col-span-2">
            <Textarea
              label="Bio"
              rows={4}
              placeholder="How you know them, who they are to you…"
              error={errors.bio?.message}
              {...register("bio")}
            />
          </div>
          <div className="md:col-span-2">{EDITORS.tags(editorProps)}</div>
        </div>
      </section>

      {PROFILE_SECTIONS.map((section, index) => (
        <SheetSection key={section.id} section={section} index={index}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {section.fields.map((key) => (
              <div key={key} className={cn(WIDE.has(key) && "md:col-span-2")}>
                {EDITORS[key]({ ...editorProps, solo: section.fields.length === 1 })}
              </div>
            ))}
          </div>
        </SheetSection>
      ))}

      <FormActionBar
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />

      <ConfirmDialog
        isOpen={guard.pendingHref !== null}
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
