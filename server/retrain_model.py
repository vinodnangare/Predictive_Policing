#!/usr/bin/env python3
# pyright: reportMissingImports=false, reportMissingModuleSource=false
import os
import sys
import json
from datetime import datetime, timedelta, timezone
import pickle
from collections import Counter
import re

try:
    from pymongo import MongoClient
    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score
except Exception as e:
    print(json.dumps({"error": "Missing python dependencies", "details": str(e)}))
    sys.exit(2)

def parse_crime_date(value):
    """Parse common date formats used by crime records."""
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)

    text = str(value or '').strip()
    if not text:
        return None

    candidates = [text]
    if 'T' in text:
        candidates.append(text.split('T')[0])
    if ' ' in text:
        candidates.append(text.split(' ')[0])

    known_formats = ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%Y')
    for candidate in candidates:
        for fmt in known_formats:
            try:
                return datetime.strptime(candidate, fmt)
            except ValueError:
                continue

    try:
        parsed = datetime.fromisoformat(text.replace('Z', '+00:00'))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed
    except ValueError:
        return None

def analyze_time_patterns(crimes):
    """Analyze temporal patterns in crimes"""
    times = []
    days = []
    for crime in crimes:
        try:
            time_str = str(crime.get('time') or '12:00')
            hour = int(time_str.split(':')[0])
            # Convert to period of day
            if 5 <= hour < 12:
                times.append('Morning')
            elif 12 <= hour < 17:
                times.append('Afternoon')
            elif 17 <= hour < 22:
                times.append('Evening')
            else:
                times.append('Night')

            parsed_date = parse_crime_date(crime.get('date'))
            if parsed_date is not None:
                days.append(parsed_date.weekday())
        except (ValueError, TypeError, AttributeError, IndexError):
            continue
    
    
    time_counts = Counter(times)
    common_time = time_counts.most_common(1)[0][0] if times else 'Unknown'
    
    
    day_counts = Counter(days)
    total_days = len(days) or 1
    day_probs = {day: count/total_days for day, count in day_counts.items()}
    
    return common_time, day_probs

def predict_next_crime(time_of_day, day_probs):
    """Predict next likely crime date based on patterns"""
    today = datetime.now()
    
    next_days = []
    for i in range(1, 8):
        future = today + timedelta(days=i)
        weekday = future.weekday()
        prob = day_probs.get(weekday, 0.1)  
        next_days.append((future, prob))
    
    
    weights = [1.0/(i+1) for i in range(7)]  
    
    
    weighted_days = [(date, prob * weight) 
                    for (date, prob), weight in zip(next_days, weights)]
    
    
    predicted_date = max(weighted_days, key=lambda x: x[1])[0]
    return predicted_date.strftime('%Y-%m-%d')


def get_db(uri):
    client = MongoClient(uri)
    db = client.get_default_database()
    if db is None:
        # fallback db name
        db = client['CrimeMap']  
    return db


def get_known_location(city_name):
    """Returns known coordinates for important cities/areas"""
    known_locations = {
        'kopargaon': {
            'lat': 19.8968,
            'lng': 74.4785,
            'area_name': 'Kopargaon',
            'district': 'Ahmednagar',
            'state': 'Maharashtra'
        },
        'niphad': {
            'lat': 20.0799,
            'lng': 74.1099,
            'area_name': 'Niphad',
            'district': 'Nashik',
            'state': 'Maharashtra'
        },
        'mumbai': {
            'lat': 19.0760,
            'lng': 72.8777,
            'area_name': 'Mumbai',
            'district': 'Mumbai City',
            'state': 'Maharashtra'
        },
        'pune': {
            'lat': 18.5204,
            'lng': 73.8567,
            'area_name': 'Pune',
            'district': 'Pune',
            'state': 'Maharashtra'
        },
        'nashik': {
            'lat': 20.0059,
            'lng': 73.7907,
            'area_name': 'Nashik',
            'district': 'Nashik',
            'state': 'Maharashtra'
        },
        'delhi': {
            'lat': 28.6139,
            'lng': 77.2090,
            'area_name': 'Delhi',
            'district': 'New Delhi',
            'state': 'Delhi'
        },
        'bangalore': {
            'lat': 12.9716,
            'lng': 77.5946,
            'area_name': 'Bangalore',
            'district': 'Bangalore Urban',
            'state': 'Karnataka'
        },
        # Add more cities as needed
    }
    return known_locations.get(city_name.lower())

def clean_address_parts(parts):
    """Clean and normalize address parts"""
    cleaned = []
    for part in parts:
        # Normalize: strip, lowercase, remove surrounding punctuation
        part = part.strip().lower()
        # Remove common words that might interfere
        part = part.replace('city', '').replace('district', '').replace('area', '').strip()
        # Remove stray punctuation (keep alphanumerics and spaces)
        part = re.sub(r"[^a-z0-9\s]", "", part)
        if part:
            cleaned.append(part)
    return cleaned

def geocode_address(address):
    """Geocode an Indian address with pincode using Nominatim"""
    try:
        # Split and clean address parts
        parts = [p.strip() for p in address.split(',') if p.strip()]
        pincode = None
        state = None
        district = None
        city = None
        
        # Clean and extract components
        cleaned_parts = []
        raw_parts = clean_address_parts(parts)
        
        for part in raw_parts:
            
            m = re.search(r"(\d{6})", part)
            if m:
                pincode = m.group(1)
               
            if part.isdigit() and len(part) == 6:
                continue
                
           
            location = get_known_location(part)
            if location:
                if not city:
                    city = part
                    state = location['state']
                    district = location['district']
                continue
                
           
            cleaned_parts.append(part)
        
        
        if city:
            location = get_known_location(city)
            if location:
                print(json.dumps({
                    "info": f"Using precise coordinates for {location['area_name']}, {location['district']}, {location['state']}",
                    "location": location,
                    "confidence": "high"
                }), file=sys.stderr)
                return (location['lat'], location['lng'])
            
       
        search_query = ', '.join(cleaned_parts)
        if pincode:
            search_query = f"{search_query}, {pincode}, Maharashtra, India"
        else:
            search_query = f"{search_query}, Maharashtra, India"
            
        print(json.dumps({"info": f"Geocoding address: {search_query}"}), file=sys.stderr)
            
        
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={search_query}&countrycodes=in"
        
        import urllib.request
        import urllib.parse
        
        encoded_url = urllib.parse.quote(url, safe=':/?=&')
        req = urllib.request.Request(
            encoded_url,
            headers={'User-Agent': 'CrimeMapApp/1.0'}
        )
        
        with urllib.request.urlopen(req) as response:
            data = response.read()
            results = json.loads(data)
            
            if results:
               
                location = results[0]
                return (float(location['lat']), float(location['lon']))
    except Exception as e:
        print(json.dumps({"warning": f"Geocoding failed: {str(e)}"}), file=sys.stderr)
    return None

def validate_coordinates(lat, lon):
    """Validate if coordinates are within Maharashtra region"""
   
    MAHARASHTRA_BOUNDS = {
        'min_lat': 15.6,
        'max_lat': 22.1,
        'min_lon': 72.6,
        'max_lon': 80.9
    }
    
    if (MAHARASHTRA_BOUNDS['min_lat'] <= lat <= MAHARASHTRA_BOUNDS['max_lat'] and
        MAHARASHTRA_BOUNDS['min_lon'] <= lon <= MAHARASHTRA_BOUNDS['max_lon']):
        return True
    return False

def parse_coord_from_location(loc):
    """Parse coordinates from location string or geocode if it's an address"""
    if not loc or not isinstance(loc, str):
        return None
        
    
    parts = [p.strip().lower() for p in loc.split(',')]
    known_city_aliases = {
        'kopargaon': ['kopargaon', 'kopargaoncity', 'kopargaon city'],
        'niphad': ['niphad', 'niphadcity', 'niphad city'],
        'pune': ['pune', 'punecity', 'pune city'],
        'nashik': ['nashik', 'nasik', 'nashikcity', 'nashik city'],
        'mumbai': ['mumbai', 'mumbaicity', 'mumbai city']
    }
    
    for part in parts:
       
        norm = re.sub(r"[^a-z0-9\s]", "", part)
        for city, aliases in known_city_aliases.items():
           
            if any(alias in norm for alias in aliases):
                location = get_known_location(city)
                if location:
                    return (location['lat'], location['lng'])
    
   
    if len(parts) >= 2:
        try:
            lat = float(parts[0])
            lon = float(parts[1])
            if validate_coordinates(lat, lon):
                return (lat, lon)
        except ValueError:
            pass  

    
    coords = geocode_address(loc)
    if coords:
        lat, lon = coords
        if validate_coordinates(lat, lon):
            return coords
            
    
    for part in parts:
        location = get_known_location(part)
        if location:
            return (location['lat'], location['lng'])
            
    return None


def main():
    uri = os.environ.get('DB_URL') or os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/predictive_policing'
    try:
        db = get_db(uri)
    except Exception as e:
        print(json.dumps({"error": "Failed to connect to MongoDB", "details": str(e)}))
        sys.exit(1)

  
    coll = db.get_collection('crimes')

   
    docs = list(coll.find({}))
    print(json.dumps({"info": f"Retrieved {len(docs)} crime records from database"}), file=sys.stderr)
    
   
    if docs:
        sample = docs[:2]
        print(json.dumps({
            "debug": "Sample crime records",
            "samples": [{
                "location": d.get("location"),
                "type": d.get("type"),
                "date": d.get("date")
            } for d in sample]
        }), file=sys.stderr)
    if not docs:
        print(json.dumps({"error": "No crime records found in database"}))
        sys.exit(3)
    
    print(json.dumps({"info": f"Found {len(docs)} crime records"}), file=sys.stderr)

    points = []
    aligned_docs = []
    skipped = []
    skip_reason_counts = Counter()
    direct_coordinate_hits = 0
    geocoded_hits = 0

    def mark_skipped(doc, reason, extra=None):
        payload = {"id": str(doc.get('_id')), "reason": reason}
        if extra:
            payload.update(extra)
        skipped.append(payload)
        skip_reason_counts[reason] += 1

    for d in docs:
        lat = d.get('latitude')
        lon = d.get('longitude')

        try:
            if lat is not None and lon is not None:
                lat_f = float(lat)
                lon_f = float(lon)
                if -90 <= lat_f <= 90 and -180 <= lon_f <= 180:
                    points.append((lat_f, lon_f))
                    aligned_docs.append(d)
                    direct_coordinate_hits += 1
                    continue
                mark_skipped(d, "coordinates out of range", {"lat": lat_f, "lon": lon_f})
                continue
        except (ValueError, TypeError) as e:
            mark_skipped(d, "invalid coordinate format", {"details": str(e)})

        loc = str(d.get('location') or '').strip()
        if loc:
            coords = parse_coord_from_location(loc)
            if coords:
                lat_f, lon_f = coords
                if -90 <= lat_f <= 90 and -180 <= lon_f <= 180:
                    points.append((lat_f, lon_f))
                    aligned_docs.append(d)
                    geocoded_hits += 1
                    continue
                mark_skipped(d, "geocoded coordinates out of range")
            else:
                mark_skipped(d, "geocoding failed", {"location": loc})
        else:
            mark_skipped(d, "no coordinates or location string")

    n_points = len(points)
    if n_points == 0:
        print(json.dumps({
            "error": "No valid geocoded points found to train on",
            "total_records": len(docs),
            "skipped_records": skipped[:20],
            "skip_reasons": dict(skip_reason_counts)
        }))
        sys.exit(3)

    coverage_percent = round((n_points / max(1, len(docs))) * 100, 2)
    print(json.dumps({
        "info": f"Using {n_points} points for training",
        "coverage_percent": coverage_percent,
        "direct_coordinate_hits": direct_coordinate_hits,
        "geocoded_hits": geocoded_hits,
        "skipped": len(skipped),
        "skip_reasons": dict(skip_reason_counts),
        "skipped_details": skipped[:5]
    }), file=sys.stderr)

    X = np.array(points, dtype=float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    best_k = 1
    best_silhouette = None
    candidate_clusters = []
    if n_points >= 4:
        upper_bound = min(12, max(2, int(np.sqrt(n_points)) + 2))
        candidate_clusters = [k for k in range(2, upper_bound + 1) if k < n_points]

    if candidate_clusters:
        best_score = -1.0
        for k in candidate_clusters:
            candidate_model = KMeans(
                n_clusters=k,
                random_state=42,
                n_init=20,
                max_iter=500,
            )
            candidate_labels = candidate_model.fit_predict(X_scaled)
            if len(set(candidate_labels.tolist())) < 2:
                continue
            score = float(silhouette_score(X_scaled, candidate_labels))
            if score > best_score:
                best_score = score
                best_k = k

        if best_score >= 0:
            best_silhouette = best_score

    n_clusters = max(1, min(best_k, n_points))
    print(json.dumps({
        "info": "Cluster selection complete",
        "candidate_clusters": candidate_clusters,
        "clusters_chosen": n_clusters,
        "selection_silhouette": round(best_silhouette, 4) if best_silhouette is not None else None
    }), file=sys.stderr)

    try:
        kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=42,
            n_init=30,
            max_iter=600,
        ).fit(X)

        centers = kmeans.cluster_centers_.tolist()
        labels = kmeans.labels_.tolist()

        model_path = os.path.join(os.path.dirname(__file__), 'crime_hotspot_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(kmeans, f)

        hotspots = []
        cluster_spreads_km = []
        current_date = datetime.now()

        for i, center in enumerate(centers):
            cluster_indices = [idx for idx, label in enumerate(labels) if label == i]
            cluster_docs = [aligned_docs[idx] for idx in cluster_indices]
            cluster_points = X[cluster_indices]

            if not cluster_docs:
                continue

            center_lat, center_lng = float(center[0]), float(center[1])

            if len(cluster_points) > 0:
                distances = np.linalg.norm(cluster_points - np.array([center_lat, center_lng]), axis=1)
                spread_km = float(np.mean(distances) * 111.0)
            else:
                spread_km = 0.0
            cluster_spreads_km.append(spread_km)

            time_of_day, day_probs = analyze_time_patterns(cluster_docs)

            crime_types = [doc.get('type', 'Unknown') for doc in cluster_docs]
            type_counts = Counter(crime_types)
            common_types = [crime_type for crime_type, _ in type_counts.most_common(3)]

            n_crimes = len(cluster_docs)
            parsed_dates = [parse_crime_date(doc.get('date')) for doc in cluster_docs]
            valid_dates = [d for d in parsed_dates if d is not None]
            recent_dates = []
            for parsed_date in valid_dates:
                age_days = (current_date - parsed_date).days
                if 0 <= age_days <= 30:
                    recent_dates.append(parsed_date)

            recency_ratio = len(recent_dates) / max(1, n_crimes)
            recency_score = min(100.0, (recency_ratio * 100.0) + (len(recent_dates) * 3.0))
            time_consistency = max(day_probs.values()) * 100 if day_probs else 45.0
            compactness_score = max(30.0, 100.0 - min(70.0, spread_km * 2.2))
            base_density_score = min(100.0, max(25.0, (n_crimes / max(1, n_points)) * 140.0))

            risk = min(
                100.0,
                (base_density_score * 0.45) +
                (time_consistency * 0.20) +
                (recency_score * 0.20) +
                (compactness_score * 0.15)
            )
            confidence = min(
                100.0,
                35.0 + (n_crimes * 4.0) + (compactness_score * 0.28) + (time_consistency * 0.15)
            )

            next_date = predict_next_crime(time_of_day, day_probs)
            type_breakdown = [{"type": crime_type, "count": count} for crime_type, count in type_counts.most_common()]

            locations = []
            for doc in cluster_docs:
                location_label = (
                    str(doc.get('location') or '').strip() or
                    str(doc.get('subdistrict') or '').strip() or
                    str(doc.get('district') or '').strip() or
                    'Unknown Area'
                )
                locations.append(location_label.split(',')[0].strip().title() or 'Unknown Area')

            location_counts = Counter(locations)
            common_locations = [
                {"name": loc, "count": count}
                for loc, count in location_counts.most_common(3)
            ]

            main_area = common_locations[0]['name'] if common_locations else "Unknown Area"
            area_info = get_known_location(main_area.lower()) or {}

            trend = "stable"
            if recency_ratio >= 0.5:
                trend = "increasing"
            elif recency_ratio <= 0.2:
                trend = "decreasing"

            location_detail = area_info.get('area_name', main_area)
            district_detail = area_info.get('district', 'Unknown District')
            state_detail = area_info.get('state', 'Unknown State')

            hotspots.append({
                'lat': center_lat,
                'lng': center_lng,
                'prediction': {
                    'likelihood': int(round(min(100.0, risk))),
                    'nextPossibleDay': next_date,
                    'commonCrimeTypes': common_types,
                    'timeOfDay': time_of_day,
                    'confidence': int(round(min(100.0, confidence))),
                    'crimeCount': int(n_crimes),
                    'recentCrimes': int(len(recent_dates)),
                    'clusterSpreadKm': round(spread_km, 3),
                    'typeBreakdown': type_breakdown,
                    'commonLocations': common_locations,
                    'trend': trend,
                    'areaInfo': {
                        'name': location_detail,
                        'district': district_detail,
                        'state': state_detail,
                        'crimeDistribution': [
                            {'location': loc, 'count': int(count)}
                            for loc, count in location_counts.most_common()
                        ]
                    },
                    'riskFactors': {
                        'recentActivity': len(recent_dates) > 0,
                        'highFrequency': n_crimes > 5,
                        'timePattern': bool(day_probs and max(day_probs.values()) > 0.3),
                        'multipleTypes': len(common_types) > 1,
                        'highDensity': base_density_score > 65,
                    },
                    'lastUpdated': current_date.isoformat()
                }
            })

        model_silhouette = None
        if n_clusters > 1 and len(set(labels)) > 1 and n_points > n_clusters:
            try:
                model_silhouette = float(silhouette_score(X_scaled, np.array(labels)))
            except Exception:
                model_silhouette = None

        cluster_sizes = Counter(labels)
        metrics = {
            'recordsFetched': int(len(docs)),
            'recordsUsed': int(n_points),
            'recordsSkipped': int(len(skipped)),
            'coveragePercent': coverage_percent,
            'directCoordinateHits': int(direct_coordinate_hits),
            'geocodedHits': int(geocoded_hits),
            'skipReasons': {reason: int(count) for reason, count in skip_reason_counts.items()},
            'clusterCount': int(n_clusters),
            'clusterSizes': {str(label): int(count) for label, count in sorted(cluster_sizes.items())},
            'selectionSilhouette': round(best_silhouette, 4) if best_silhouette is not None else None,
            'silhouetteScore': round(model_silhouette, 4) if model_silhouette is not None else None,
            'modelInertia': round(float(kmeans.inertia_), 4),
            'avgClusterSpreadKm': round(float(np.mean(cluster_spreads_km)), 3) if cluster_spreads_km else 0.0,
        }

        output = {
            'hotspots': hotspots,
            'metrics': metrics,
            'n_points': n_points,
            'n_clusters': n_clusters,
            'skipped_preview': skipped[:10],
            'trained_at': datetime.now(timezone.utc).isoformat()
        }
        print(json.dumps(output))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": "Training failed", "details": str(e)}))
        sys.exit(4)


if __name__ == '__main__':
    main()
