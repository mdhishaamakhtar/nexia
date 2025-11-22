"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import Input from "@/components/atoms/Input";
import Textarea from "@/components/atoms/Textarea";
import Button from "@/components/atoms/Button";
import Chip from "@/components/atoms/Chip";
import api from "@/lib/api";

export default function NewProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Basic Info
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [profession, setProfession] = useState("");
    const [longTermGoals, setLongTermGoals] = useState("");
    const [relationshipType, setRelationshipType] = useState("Friend");
    const [birthday, setBirthday] = useState("");
    const [musicPreference, setMusicPreference] = useState("");
    const [favoriteMovie, setFavoriteMovie] = useState("");
    const [favoriteBook, setFavoriteBook] = useState("");
    const [favoriteMemory, setFavoriteMemory] = useState("");

    // Lists
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [politicalViews, setPoliticalViews] = useState<string[]>([]);
    const [politicalViewInput, setPoliticalViewInput] = useState("");
    const [foodRestrictions, setFoodRestrictions] = useState<string[]>([]);
    const [foodRestrictionInput, setFoodRestrictionInput] = useState("");
    const [movieGenres, setMovieGenres] = useState<string[]>([]);
    const [movieGenreInput, setMovieGenreInput] = useState("");
    const [bookGenres, setBookGenres] = useState<string[]>([]);
    const [bookGenreInput, setBookGenreInput] = useState("");
    const [hangoutPlaces, setHangoutPlaces] = useState<string[]>([]);
    const [hangoutPlaceInput, setHangoutPlaceInput] = useState("");
    const [quotes, setQuotes] = useState<string[]>([]);
    const [quoteInput, setQuoteInput] = useState("");

    // Songs
    const [associatedSongName, setAssociatedSongName] = useState("");
    const [associatedSongArtist, setAssociatedSongArtist] = useState("");
    const [topSongs, setTopSongs] = useState<{ name: string; artist: string }[]>([]);
    const [songNameInput, setSongNameInput] = useState("");
    const [songArtistInput, setSongArtistInput] = useState("");

    const addItem = (value: string, setter: (items: string[]) => void, items: string[], inputSetter: (val: string) => void) => {
        if (value.trim()) {
            setter([...items, value.trim()]);
            inputSetter("");
        }
    };

    const removeItem = (index: number, setter: (items: string[]) => void, items: string[]) => {
        setter(items.filter((_, i) => i !== index));
    };

    const addSong = () => {
        if (songNameInput.trim() && songArtistInput.trim() && topSongs.length < 3) {
            setTopSongs([...topSongs, { name: songNameInput.trim(), artist: songArtistInput.trim() }]);
            setSongNameInput("");
            setSongArtistInput("");
        }
    };

    const removeSong = (index: number) => {
        setTopSongs(topSongs.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload: any = {
                full_name: fullName,
                relationship_type: relationshipType,
            };

            if (bio) payload.bio = bio;
            if (profession) payload.profession = profession;
            if (longTermGoals) payload.long_term_goals = longTermGoals;
            if (birthday) payload.birthday = birthday;
            if (musicPreference) payload.music_preference = musicPreference;
            if (favoriteMovie) payload.favorite_movie = favoriteMovie;
            if (favoriteBook) payload.favorite_book = favoriteBook;
            if (favoriteMemory) payload.favorite_memory = favoriteMemory;

            if (tags.length > 0) payload.tags = tags.map(tag => ({ tag }));
            if (politicalViews.length > 0) payload.political_views = politicalViews.map(view => ({ view }));
            if (foodRestrictions.length > 0) payload.food_restrictions = foodRestrictions.map(restriction => ({ restriction }));
            if (movieGenres.length > 0) payload.movie_genres = movieGenres.map(genre => ({ genre }));
            if (bookGenres.length > 0) payload.book_genres = bookGenres.map(genre => ({ genre }));
            if (hangoutPlaces.length > 0) payload.hangout_places = hangoutPlaces.map(place => ({ place }));
            if (quotes.length > 0) payload.quotes = quotes.map(quote => ({ quote }));
            if (topSongs.length > 0) payload.top_songs = topSongs;
            if (associatedSongName && associatedSongArtist) {
                payload.associated_song = { name: associatedSongName, artist: associatedSongArtist };
            }

            await api.post("/profiles", payload);
            router.push("/profiles");
        } catch (error) {
            console.error("Failed to create profile:", error);
            alert("Failed to create profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const SectionWrapper = ({ title, children, color = "maroon" }: { title: string; children: React.ReactNode; color?: string }) => {
        const borderColors = {
            maroon: "border-[var(--color-accent)]",
            blue: "border-[var(--color-blue-accent)]",
            purple: "border-[var(--color-purple-accent)]",
            teal: "border-[var(--color-teal-accent)]",
        };

        return (
            <div className={`bg-[var(--color-surface)] rounded-2xl p-6 border-l-4 ${borderColors[color as keyof typeof borderColors]} border-t border-r border-b border-[var(--color-border-subtle)]`}>
                <h2 className="text-2xl font-semibold mb-6">{title}</h2>
                {children}
            </div>
        );
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen">
                <Navbar />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <h1 className="text-4xl font-bold mb-8">Add to Nexia</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <SectionWrapper title="Basic Info" color="maroon">
                            <div className="space-y-4">
                                <Input label="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter their name" />

                                <div>
                                    <label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 block">Relationship Type *</label>
                                    <select
                                        value={relationshipType}
                                        onChange={(e) => setRelationshipType(e.target.value)}
                                        className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] px-4 py-3 rounded-xl border border-[var(--color-border-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-20 transition-all duration-200"
                                    >
                                        <option value="Friend">Friend</option>
                                        <option value="Family">Family</option>
                                        <option value="Colleague">Colleague</option>
                                        <option value="Classmate">Classmate</option>
                                        <option value="Crush">Crush</option>
                                        <option value="Ex">Ex</option>
                                        <option value="Mentor">Mentor</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <Input label="Birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" />
                                <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short description about them..." rows={3} />
                                <Input label="Profession" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="What do they do?" />
                                <Textarea label="Long Term Goals" value={longTermGoals} onChange={(e) => setLongTermGoals(e.target.value)} placeholder="Their aspirations and dreams..." rows={3} />
                            </div>
                        </SectionWrapper>

                        {/* Tags */}
                        <SectionWrapper title="Tags" color="purple">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag..." />
                                    <button type="button" onClick={() => addItem(tagInput, setTags, tags, setTagInput)} className="px-4 bg-[var(--color-purple-accent)] hover:bg-[#7c3aed] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag, i) => (<Chip key={i} label={tag} onDelete={() => removeItem(i, setTags, tags)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Political Views */}
                        <SectionWrapper title="Political Views" color="teal">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={politicalViewInput} onChange={(e) => setPoliticalViewInput(e.target.value)} placeholder="Add a political view..." />
                                    <button type="button" onClick={() => addItem(politicalViewInput, setPoliticalViews, politicalViews, setPoliticalViewInput)} className="px-4 bg-[var(--color-teal-accent)] hover:bg-[#0d9488] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {politicalViews.map((view, i) => (<Chip key={i} label={view} onDelete={() => removeItem(i, setPoliticalViews, politicalViews)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Food Restrictions */}
                        <SectionWrapper title="Food Restrictions" color="blue">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={foodRestrictionInput} onChange={(e) => setFoodRestrictionInput(e.target.value)} placeholder="Add a food restriction..." />
                                    <button type="button" onClick={() => addItem(foodRestrictionInput, setFoodRestrictions, foodRestrictions, setFoodRestrictionInput)} className="px-4 bg-[var(--color-blue-accent)] hover:bg-[#357abd] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {foodRestrictions.map((restriction, i) => (<Chip key={i} label={restriction} onDelete={() => removeItem(i, setFoodRestrictions, foodRestrictions)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Movie Genres */}
                        <SectionWrapper title="Favorite Movie Genres" color="purple">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={movieGenreInput} onChange={(e) => setMovieGenreInput(e.target.value)} placeholder="Add a movie genre..." />
                                    <button type="button" onClick={() => addItem(movieGenreInput, setMovieGenres, movieGenres, setMovieGenreInput)} className="px-4 bg-[var(--color-purple-accent)] hover:bg-[#7c3aed] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {movieGenres.map((genre, i) => (<Chip key={i} label={genre} onDelete={() => removeItem(i, setMovieGenres, movieGenres)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Book Genres */}
                        <SectionWrapper title="Favorite Book Genres" color="teal">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={bookGenreInput} onChange={(e) => setBookGenreInput(e.target.value)} placeholder="Add a book genre..." />
                                    <button type="button" onClick={() => addItem(bookGenreInput, setBookGenres, bookGenres, setBookGenreInput)} className="px-4 bg-[var(--color-teal-accent)] hover:bg-[#0d9488] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {bookGenres.map((genre, i) => (<Chip key={i} label={genre} onDelete={() => removeItem(i, setBookGenres, bookGenres)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Hangout Places */}
                        <SectionWrapper title="Favorite Hangout Places" color="blue">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={hangoutPlaceInput} onChange={(e) => setHangoutPlaceInput(e.target.value)} placeholder="Add a hangout place..." />
                                    <button type="button" onClick={() => addItem(hangoutPlaceInput, setHangoutPlaces, hangoutPlaces, setHangoutPlaceInput)} className="px-4 bg-[var(--color-blue-accent)] hover:bg-[#357abd] rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {hangoutPlaces.map((place, i) => (<Chip key={i} label={place} onDelete={() => removeItem(i, setHangoutPlaces, hangoutPlaces)} />))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Music Preference */}
                        <SectionWrapper title="Music Preference" color="maroon">
                            <Textarea value={musicPreference} onChange={(e) => setMusicPreference(e.target.value)} placeholder="What kind of music do they enjoy?" rows={3} />
                        </SectionWrapper>

                        {/* Favorite Movie */}
                        <SectionWrapper title="Favorite Movie" color="purple">
                            <Input value={favoriteMovie} onChange={(e) => setFavoriteMovie(e.target.value)} placeholder="Their all-time favorite movie" />
                        </SectionWrapper>

                        {/* Favorite Book */}
                        <SectionWrapper title="Favorite Book" color="teal">
                            <Input value={favoriteBook} onChange={(e) => setFavoriteBook(e.target.value)} placeholder="Their all-time favorite book" />
                        </SectionWrapper>

                        {/* Song I Associate With Them */}
                        <SectionWrapper title="Song I Associate With Them" color="blue">
                            <div className="space-y-4">
                                <Input label="Song Name" value={associatedSongName} onChange={(e) => setAssociatedSongName(e.target.value)} placeholder="Song that reminds you of them" />
                                <Input label="Artist" value={associatedSongArtist} onChange={(e) => setAssociatedSongArtist(e.target.value)} placeholder="Artist name" />
                            </div>
                        </SectionWrapper>

                        {/* Their Top Songs */}
                        <SectionWrapper title="Their Top Songs (Max 3)" color="purple">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Input value={songNameInput} onChange={(e) => setSongNameInput(e.target.value)} placeholder="Song name" />
                                    <Input value={songArtistInput} onChange={(e) => setSongArtistInput(e.target.value)} placeholder="Artist" />
                                    <button type="button" onClick={addSong} disabled={topSongs.length >= 3} className="px-4 bg-[var(--color-purple-accent)] hover:bg-[#7c3aed] rounded-xl transition-colors disabled:opacity-50">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {topSongs.map((song, i) => (
                                        <div key={i} className="flex justify-between items-center bg-[var(--color-bg)] px-4 py-3 rounded-lg">
                                            <span>{song.name} - {song.artist}</span>
                                            <button type="button" onClick={() => removeSong(i)} className="text-red-500 hover:text-red-400">Remove</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Words They Said (Quotes) */}
                        <SectionWrapper title="Words They Said" color="teal">
                            <div className="space-y-4">
                                <Textarea value={quoteInput} onChange={(e) => setQuoteInput(e.target.value)} placeholder="A memorable quote from them..." rows={3} />
                                <button type="button" onClick={() => addItem(quoteInput, setQuotes, quotes, setQuoteInput)} className="w-full bg-[var(--color-teal-accent)] hover:bg-[#0d9488] text-white px-4 py-2 rounded-xl transition-colors">
                                    Add Quote
                                </button>
                                <div className="space-y-2">
                                    {quotes.map((quote, i) => (
                                        <div key={i} className="flex justify-between items-start bg-[var(--color-bg)] px-4 py-3 rounded-lg">
                                            <p className="font-serif italic text-sm flex-1">&ldquo;{quote.length > 100 ? quote.substring(0, 100) + '...' : quote}&rdquo;</p>
                                            <button type="button" onClick={() => removeItem(i, setQuotes, quotes)} className="text-red-500 hover:text-red-400 ml-4">Remove</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SectionWrapper>

                        {/* Favorite Memory */}
                        <SectionWrapper title="Favorite Memory" color="maroon">
                            <Textarea value={favoriteMemory} onChange={(e) => setFavoriteMemory(e.target.value)} placeholder="A cherished moment with them..." rows={5} />
                        </SectionWrapper>

                        {/* Submit */}
                        <Button type="submit" isLoading={isLoading} variant="primary" className="w-full text-lg py-4">
                            Save to Nexia
                        </Button>
                    </form>
                </div>
            </div>
        </ProtectedRoute>
    );
}
